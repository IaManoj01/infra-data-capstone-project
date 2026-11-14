import numpy as np
import pandas as pd

from decimal import Decimal, ROUND_HALF_UP

from src.generators.weather_generator import generate_weather_data
from src.generators.generation_generator import generate_generation_data


def expected_interval_energy(ac_power_kw, interval_minutes):

    energy = Decimal(str(ac_power_kw)) * Decimal(str(interval_minutes)) / Decimal("60")

    return float(energy.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def test_generation_generator():

    print("\n========== GENERATION GENERATOR TEST ==========\n")

    interval_minutes = 15

    # --------------------------------------------------
    # 1. Generate weather observations
    # --------------------------------------------------

    weather_df = generate_weather_data(
        start_time="2026-10-01T00:00:00Z",
        periods=96,
        interval_minutes=interval_minutes,
        site_ids=("SITE_001", "SITE_002"),
        seed=42,
    )

    print("Weather records:", len(weather_df))

    # --------------------------------------------------
    # 2. Generate inverter observations
    # --------------------------------------------------

    generation_df = generate_generation_data(
        weather_df=weather_df, seed=42, interval_minutes=interval_minutes
    )

    print("Generation records:", len(generation_df))

    assert len(generation_df) == 768

    # --------------------------------------------------
    # 3. Validate columns
    # --------------------------------------------------

    expected_columns = [
        "timestamp",
        "site_id",
        "inverter_id",
        "dc_power_kw",
        "ac_power_kw",
        "energy_kwh",
        "grid_voltage_v",
        "power_factor",
    ]

    assert list(generation_df.columns) == expected_columns

    # --------------------------------------------------
    # 4. Validate inverter counts
    # --------------------------------------------------

    print("\nRecords per site:")
    print(generation_df.groupby("site_id").size())

    assert generation_df.groupby("site_id").size().to_dict() == {
        "SITE_001": 384,
        "SITE_002": 384,
    }

    print("\nRecords per inverter:")
    print(generation_df.groupby(["site_id", "inverter_id"]).size())

    assert (generation_df.groupby(["site_id", "inverter_id"]).size() == 96).all()

    # --------------------------------------------------
    # 5. Validate inverter capacity limits
    # --------------------------------------------------

    capacity_limits = {"SITE_001": 500 / 4 * 0.85, "SITE_002": 750 / 4 * 0.85}

    for site_id, limit in capacity_limits.items():

        site_data = generation_df[generation_df["site_id"] == site_id]

        assert (site_data["ac_power_kw"] <= limit).all()

        print(f"\n{site_id} maximum AC limit: {limit} kW")

        print(f"{site_id} actual maximum AC: " f"{site_data['ac_power_kw'].max()} kW")

    # --------------------------------------------------
    # 6. Validate energy calculations
    # --------------------------------------------------

    expected_energy = generation_df["ac_power_kw"].apply(
        lambda power: expected_interval_energy(power, interval_minutes)
    )

    mismatches = generation_df[
        ~np.isclose(generation_df["energy_kwh"], expected_energy, rtol=0, atol=0.001)
    ].copy()

    if not mismatches.empty:

        mismatches["expected_energy_kwh"] = expected_energy.loc[mismatches.index]

        print("\nEnergy calculation mismatches:")

        print(
            mismatches[["ac_power_kw", "energy_kwh", "expected_energy_kwh"]]
            .head(20)
            .to_string(index=False)
        )

        raise AssertionError(f"Found {len(mismatches)} energy calculation mismatches.")

    print("\nEnergy calculation: PASSED")

    # --------------------------------------------------
    # 7. Validate nighttime generation
    # --------------------------------------------------

    inspection_df = generation_df.copy()

    inspection_df["local_time"] = inspection_df["timestamp"].dt.tz_convert(
        "Asia/Kolkata"
    )

    decimal_hour = (
        inspection_df["local_time"].dt.hour + inspection_df["local_time"].dt.minute / 60
    )

    nighttime = inspection_df[(decimal_hour <= 6) | (decimal_hour >= 18)]

    assert (nighttime["dc_power_kw"] == 0).all()
    assert (nighttime["ac_power_kw"] == 0).all()
    assert (nighttime["energy_kwh"] == 0).all()

    print("\nNighttime generation: PASSED")

    # --------------------------------------------------
    # 8. Validate weather-generation alignment
    # --------------------------------------------------

    weather_keys = set(zip(weather_df["timestamp"], weather_df["site_id"]))

    generation_keys = set(zip(generation_df["timestamp"], generation_df["site_id"]))

    assert weather_keys == generation_keys

    print("Weather-generation alignment: PASSED")

    # --------------------------------------------------
    # 9. Validate duplicate records
    # --------------------------------------------------

    duplicates = generation_df.duplicated(
        subset=["timestamp", "site_id", "inverter_id"]
    ).sum()

    print("\nDuplicate records:", duplicates)

    assert duplicates == 0

    # --------------------------------------------------
    # 10. Validate power and electrical measurements
    # --------------------------------------------------

    assert (generation_df["dc_power_kw"] >= 0).all()
    assert (generation_df["ac_power_kw"] >= 0).all()
    assert (generation_df["energy_kwh"] >= 0).all()

    assert generation_df["grid_voltage_v"].notnull().all()

    assert generation_df["power_factor"].between(0, 1).all()

    print("Power and electrical measurements: PASSED")

    # --------------------------------------------------
    # 11. Check deterministic output
    # --------------------------------------------------

    repeated_df = generate_generation_data(
        weather_df=weather_df, seed=42, interval_minutes=interval_minutes
    )

    pd.testing.assert_frame_equal(generation_df, repeated_df)

    print("Reproducibility: PASSED")

    # --------------------------------------------------
    # 12. Display sample
    # --------------------------------------------------

    print("\nSample generation records:")

    print(generation_df.head(10).to_string(index=False))

    print("\n========== ALL TESTS PASSED ==========\n")


if __name__ == "__main__":
    test_generation_generator()
