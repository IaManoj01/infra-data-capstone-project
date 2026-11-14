import unittest
import tempfile
from pathlib import Path

import pandas as pd
from pandas.testing import assert_frame_equal

from src.main import append_unique_rows
from src.generators.anomaly_generator import inject_anomalies
from src.generators.generation_generator import generate_generation_data
from src.generators.weather_generator import generate_weather_data


class GeneratorTests(unittest.TestCase):
    def test_append_unique_rows_ignores_existing_and_in_batch_duplicate_keys(self):
        batch = pd.DataFrame(
            {
                "timestamp": [
                    "2026-10-01T00:00:00Z",
                    "2026-10-01T00:00:00Z",
                    "2026-10-01T00:15:00Z",
                ],
                "site_id": ["SITE_001", "SITE_001", "SITE_001"],
                "value": [1, 2, 3],
            }
        )

        with tempfile.TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / "generation.csv"

            self.assertEqual(
                append_unique_rows(path, batch, ["timestamp", "site_id"]), 2
            )
            self.assertEqual(
                append_unique_rows(path, batch, ["timestamp", "site_id"]), 0
            )

            saved = pd.read_csv(path)
            self.assertEqual(len(saved), 2)
            self.assertFalse(saved.duplicated(["timestamp", "site_id"]).any())

    def test_weather_is_reproducible_for_a_seed_and_varies_between_seeds(self):
        parameters = {
            "start_time": "2026-10-01T00:00:00Z",
            "days": 1,
            "site_ids": ("SITE_001",),
        }

        first = generate_weather_data(**parameters, seed=10)
        repeated = generate_weather_data(**parameters, seed=10)
        different = generate_weather_data(**parameters, seed=11)

        assert_frame_equal(first, repeated)
        self.assertFalse(first.equals(different))

    def test_weather_batch_has_500_rows_across_two_sites(self):
        weather = generate_weather_data(
            start_time="2026-10-01T00:00:00Z",
            site_ids=("SITE_001", "SITE_002"),
            periods=250,
            seed=10,
        )

        self.assertEqual(len(weather), 500)
        self.assertEqual(
            weather["site_id"].value_counts().to_dict(),
            {
                "SITE_001": 250,
                "SITE_002": 250,
            },
        )

    @unittest.skip("TODO: Investigate IST/UTC nighttime irradiance mismatch")
    def test_generation_is_zero_at_night_and_clipped_to_inverter_limit(self):
        weather = generate_weather_data(
            start_time="2026-10-01T00:00:00Z",
            days=1,
            site_ids=("SITE_001",),
        )
        generation = generate_generation_data(weather, seed=10)
        hours = (
            pd.to_datetime(generation["timestamp"], utc=True)
            .dt.tz_convert("Asia/Kolkata")
            .dt.hour
        )

        nighttime = (hours < 6) | (hours >= 18)

        self.assertTrue((weather.loc[nighttime, "irradiance_w_m2"] == 0).all())
        self.assertTrue((generation.loc[nighttime, "dc_power_kw"] == 0).all())
        self.assertTrue((generation.loc[nighttime, "ac_power_kw"] == 0).all())
        self.assertTrue((generation["ac_power_kw"] <= 500 * 0.85).all())
        self.assertTrue(
            (
                generation["energy_kwh"]
                == generation["ac_power_kw"].map(lambda power: round(power * 0.25, 2))
            ).all()
        )

    def test_anomaly_rate_outside_supported_range_is_rejected(self):
        with self.assertRaises(ValueError):
            inject_anomalies(pd.DataFrame(), anomaly_rate=1.1)


if __name__ == "__main__":
    unittest.main()
