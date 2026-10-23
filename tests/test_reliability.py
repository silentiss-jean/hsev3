"""
Tests de fiabilité des mesures HSE V3.1 — stdlib uniquement (aucun HA, aucun pytest).

Lancer :  python3 -m unittest discover -s tests -v
"""
from __future__ import annotations

import importlib
import sys
import types
import unittest
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

_ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "hse"


def _load():
    """Charge le paquet SANS exécuter hse/__init__.py (qui importe homeassistant)."""
    if "hse_t" not in sys.modules:
        for name, sub in (("hse_t", ""), ("hse_t.engine", "engine")):
            m = types.ModuleType(name)
            m.__path__ = [str(_ROOT / sub) if sub else str(_ROOT)]
            sys.modules[name] = m
    return {n: importlib.import_module(f"hse_t.{n}") for n in (
        "engine.measure", "engine.calculation", "engine.sources", "engine.reference",
        "engine.period_stats", "time_utils", "engine.cost")}


M = _load()
measure, calc, sources = M["engine.measure"], M["engine.calculation"], M["engine.sources"]
reference, pstats, tu, cost = M["engine.reference"], M["engine.period_stats"], M["time_utils"], M["engine.cost"]


class S:
    def __init__(self, state, unit=None, dc=None, sc=None, eid=None, name=None):
        self.state = state
        self.entity_id = eid
        self.attributes = {k: v for k, v in {
            "unit_of_measurement": unit, "device_class": dc, "state_class": sc,
            "friendly_name": name}.items() if v is not None}


class TestMeasure(unittest.TestCase):
    def test_power_units(self):
        self.assertEqual(calc.get_power_w(S("2", "kW")), 2000.0)
        self.assertEqual(calc.get_power_w(S("350", "W")), 350.0)
        self.assertAlmostEqual(calc.get_power_w(S("500", "mW")), 0.5)

    def test_energy_never_counted_as_power(self):
        # Bug V3.0 : « salon tv Month Energy 42 kWh » était compté comme 42 W.
        self.assertIsNone(calc.get_power_w(S("42", "kWh", "energy", "total_increasing")))
        self.assertEqual(calc.get_energy_kwh(S("42", "kWh")), 42.0)

    def test_wh_converted(self):
        self.assertEqual(calc.get_energy_kwh(S("1500", "Wh")), 1.5)

    def test_unknown_or_missing_unit_rejected(self):
        self.assertIsNone(calc.get_power_w(S("900")))
        self.assertIsNone(calc.get_energy_kwh(S("900")))
        self.assertEqual(measure.read_state(S("900")).reason, "unit_missing")
        self.assertEqual(measure.read_state(S("9", "BTU")).reason, "unit_unsupported:BTU")

    def test_apparent_power_not_active(self):
        r = measure.read_state(S("1200", "VA", "apparent_power"))
        self.assertFalse(r.ok)
        self.assertEqual(r.reason, "unit_not_active_power:VA")

    def test_invalid_states(self):
        for bad in ("unavailable", "unknown", "", "nan", "inf", "abc", None):
            self.assertIsNone(calc.get_power_w(S(bad, "W")))

    def test_negative_and_implausible_power(self):
        self.assertEqual(measure.read_state(S("-50", "W")).reason, "negative_power")
        self.assertEqual(measure.read_state(S("250000", "W")).reason, "implausible_power")
        self.assertEqual(measure.read_state(S("250", "kW")).reason, "implausible_power")

    def test_class_unit_mismatch_unit_wins(self):
        r = measure.read_state(S("3", "kWh", "power"))
        self.assertEqual(r.kind, "energy")
        self.assertEqual(r.reason, "class_unit_mismatch")

    def test_totals_separate_kinds(self):
        st = {"a": S("100", "W"), "b": S("1", "kW"), "c": S("42", "kWh"), "d": S("7")}
        t = calc.compute_totals(["a", "b", "c", "d"], st)
        self.assertEqual(t["power_w"], 1100.0)
        self.assertEqual(t["energy_kwh"], 42.0)
        self.assertEqual((t["count_power"], t["count_energy"], t["count_ok"]), (2, 1, 3))
        self.assertEqual(t["rejected"], [{"entity_id": "d", "reason": "unit_missing"}])

    def test_top5_excludes_energy(self):
        st = {"p1": S("500", "W"), "p2": S("1500", "W"), "e": S("9999", "kWh")}
        top = calc.top_n_by_power(["p1", "p2", "e"], st)
        self.assertEqual([x["entity_id"] for x in top], ["p2", "p1"])
        self.assertEqual(top[0]["pct"], 75.0)


class TestIntegration(unittest.TestCase):
    def test_two_kw_one_hour_is_two_kwh(self):
        self.assertAlmostEqual(measure.integrate_power_kwh([(0, 2000.0)], 3600), 2.0)

    def test_unavailable_contributes_zero(self):
        s = [(0, 1000.0), (3600, None), (7200, 1000.0)]
        self.assertAlmostEqual(measure.integrate_power_kwh(s, 10800), 2.0)

    def test_counter_simple(self):
        kwh, an = measure.energy_increments_kwh([(0, 10.0), (3600, 11.0), (7200, 12.5)])
        self.assertAlmostEqual(kwh, 2.5)
        self.assertEqual(an, 0)

    def test_counter_reset_does_not_invent_energy(self):
        kwh, an = measure.energy_increments_kwh([(0, 100.0), (3600, 101.0), (7200, 0.5), (10800, 1.5)])
        self.assertAlmostEqual(kwh, 2.0)  # 1 + 0 (reset) + 1
        self.assertEqual(an, 1)

    def test_counter_glitch_to_zero_and_back(self):
        s = [(0, 1234.0), (60, 0.0), (120, 1234.0)]
        kwh, _ = measure.energy_increments_kwh(s)
        self.assertEqual(kwh, 0.0)  # 1234 kWh en 60 s = débit impossible

    def test_counter_wh_factor(self):
        kwh, _ = measure.energy_increments_kwh([(0, 1000.0), (3600, 3000.0)], factor=0.001)
        self.assertAlmostEqual(kwh, 2.0)


class TestStatsAggregation(unittest.TestCase):
    def test_energy_rows_sum_and_last_state(self):
        rows = [{"change": 1.0, "state": 10.0}, {"change": -3.0, "state": 11.0},
                {"change": 0.5, "state": 11.5}, {"change": None, "state": None}]
        kwh, last = pstats.aggregate_energy_rows(rows)
        self.assertAlmostEqual(kwh, 1.5)
        self.assertEqual(last, 11.5)

    def test_power_rows_hourly_mean(self):
        rows = [{"mean": 1000.0, "start": 0, "end": 3600}, {"mean": 500.0, "start": 3600, "end": 7200}]
        self.assertAlmostEqual(pstats.aggregate_power_rows(rows, 1.0), 1.5)

    def test_power_rows_daily_bucket_uses_real_duration(self):
        rows = [{"mean": 100.0, "start": 0, "end": 86400}]
        self.assertAlmostEqual(pstats.aggregate_power_rows(rows, 1.0), 2.4)

    def test_residual(self):
        self.assertAlmostEqual(pstats.residual_energy_kwh(12.3, 12.0, 1800), 0.3)
        self.assertEqual(pstats.residual_energy_kwh(5.0, 12.0, 1800), 0.0)   # reset
        self.assertEqual(pstats.residual_energy_kwh(None, 12.0), 0.0)
        self.assertEqual(pstats.residual_energy_kwh(1000.0, 12.0, 60), 0.0)  # débit aberrant


def _item(eid, unit, dc=None, sc=None, dev=None):
    return {"source": {"entity_id": eid, "unit": unit, "device_class": dc,
                       "state_class": sc, "device_id": dev}}


class TestSourcePlan(unittest.TestCase):
    def test_tuya_plug_no_double_count(self):
        items = [
            _item("sensor.ballon_power", "W", "power", "measurement", "dev_ballon"),
            _item("sensor.ballon_total_energy", "kWh", "energy", "total_increasing", "dev_ballon"),
            _item("sensor.ballon_month_energy", "kWh", "energy", "total_increasing", "dev_ballon"),
            _item("sensor.ballon_today_energy", "kWh", "energy", "measurement", "dev_ballon"),
        ]
        p = sources.plan_sources(items, {})
        self.assertEqual(p.live_power, ["sensor.ballon_power"])
        self.assertEqual(p.energy_meter, ["sensor.ballon_total_energy"])
        self.assertEqual(p.energy_from_power, [])
        reasons = {x["entity_id"]: x["reason"] for x in p.excluded}
        self.assertEqual(reasons["sensor.ballon_month_energy"], "period_counter_duplicate")
        self.assertEqual(reasons["sensor.ballon_today_energy"], "energy_not_cumulative")

    def test_power_only_device_is_integrated(self):
        p = sources.plan_sources([_item("sensor.clim_power", "W", "power", "measurement", "d1")], {})
        self.assertEqual(p.energy_from_power, ["sensor.clim_power"])

    def test_reference_never_summed(self):
        items = [_item("sensor.zlinky_power", "W", "power", "measurement", "z"),
                 _item("sensor.clim_power", "W", "power", "measurement", "c")]
        p = sources.plan_sources(items, {}, reference_entity_id=["sensor.zlinky_power"])
        self.assertEqual(p.live_power, ["sensor.clim_power"])
        self.assertEqual(p.reference, "sensor.zlinky_power")

    def test_unknown_unit_excluded_with_reason(self):
        p = sources.plan_sources([_item("sensor.x", None, None, None, "d")], {})
        self.assertEqual(p.excluded, [{"entity_id": "sensor.x", "reason": "unit_missing"}])

    def test_multichannel_flagged_not_dropped(self):
        items = [_item("sensor.strip_1_power", "W", "power", None, "s"),
                 _item("sensor.strip_2_power", "W", "power", None, "s")]
        p = sources.plan_sources(items, {})
        self.assertEqual(len(p.live_power), 2)
        self.assertEqual({w["code"] for w in p.warnings}, {"multiple_power_same_device"})


class TestReference(unittest.TestCase):
    def _e(self, eid, unit, dc, sc=None, name=None):
        return {"entity_id": eid, "name": name, "unit": unit, "device_class": dc, "state_class": sc}

    def test_finds_zlinky(self):
        entries = [
            self._e("sensor.zlinky_tic_active_power", "W", "power"),
            self._e("sensor.zlinky_tic_summation_delivered", "kWh", "energy", "total_increasing"),
            self._e("sensor.zlinky_tic_apparent_power", "VA", "apparent_power"),
            self._e("sensor.ballon_power", "W", "power"),
            self._e("sensor.clim_salon_energy", "kWh", "energy", "total_increasing"),
        ]
        c = reference.find_reference_candidates(entries)
        ids = [x["entity_id"] for x in c]
        self.assertNotIn("sensor.ballon_power", ids)
        self.assertNotIn("sensor.clim_salon_energy", ids)
        roles = {x["entity_id"]: x["role"] for x in c}
        self.assertEqual(roles["sensor.zlinky_tic_summation_delivered"], "energy_index")
        self.assertEqual(roles["sensor.zlinky_tic_active_power"], "active_power")
        self.assertEqual(roles["sensor.zlinky_tic_apparent_power"], "apparent_power")

    def test_coverage_statuses(self):
        self.assertEqual(reference.coverage(None, 100)["status"], "no_reference")
        self.assertEqual(reference.coverage(30, 10)["status"], "reference_too_low")
        ok = reference.coverage(1000, 600)
        self.assertEqual((ok["status"], ok["coverage_pct"], ok["untracked_w"]), ("ok", 60.0, 400.0))
        self.assertEqual(reference.coverage(1000, 1200)["status"], "tracked_exceeds_ref")
        self.assertEqual(reference.coverage(1000, 1090)["status"], "ok")

    def test_energy_coverage(self):
        self.assertEqual(reference.energy_coverage(10.0, 12.0)["status"], "tracked_exceeds_ref")
        self.assertEqual(reference.energy_coverage(10.0, 7.0)["untracked_kwh"], 3.0)


class TestWindows(unittest.TestCase):
    def test_local_midnight_paris_summer(self):
        paris = ZoneInfo("Europe/Paris")
        now = datetime(2026, 10, 22, 13, 30, tzinfo=timezone.utc)  # 15:30 CEST
        start, end = tu.window_for_period("day", now=now, tz=paris)
        self.assertEqual(start, datetime(2026, 10, 21, 22, 0, tzinfo=timezone.utc))
        self.assertEqual(end, now)

    def test_week_month_year_local(self):
        paris = ZoneInfo("Europe/Paris")
        now = datetime(2026, 10, 22, 13, 30, tzinfo=timezone.utc)  # jeudi
        self.assertEqual(tu.window_for_period("week", now, paris)[0],
                         datetime(2026, 10, 18, 22, 0, tzinfo=timezone.utc))   # lundi 19 00:00 CEST
        self.assertEqual(tu.window_for_period("month", now, paris)[0],
                         datetime(2026, 9, 30, 22, 0, tzinfo=timezone.utc))
        self.assertEqual(tu.window_for_period("year", now, paris)[0],
                         datetime(2025, 12, 31, 23, 0, tzinfo=timezone.utc))   # hiver : UTC+1

    def test_legacy_utc_behaviour_kept(self):
        now = datetime(2026, 10, 22, 13, 30, tzinfo=timezone.utc)
        self.assertEqual(tu.window_for_period("day", now)[0], datetime(2026, 10, 22, tzinfo=timezone.utc))


class TestCost(unittest.TestCase):
    def test_flat_cost(self):
        c = cost.cost_summary(10.0, {"mode": "flat", "price_ttc_kwh": 0.25, "tax_rate_pct": 20.0})
        self.assertEqual(c["cost_ttc_eur"], 2.5)
        self.assertAlmostEqual(c["cost_ht_eur"], 2.08, places=2)


if __name__ == "__main__":
    unittest.main()
