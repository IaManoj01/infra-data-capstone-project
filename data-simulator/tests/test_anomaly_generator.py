import numpy as np
import pandas as pd

from src.generators.weather_generator import generate_weather_data
from src.generators.generation_generator import generate_generation_data
from src.generators.anomaly_generator import inject_anomalies


def test_anomaly_generator():

    print("\n========== ANOMALY GENERATOR TEST ==========\n")

    # --------------------------------------------------
    # 1. Generate normal weather data
    # --------------------------------------------------

    weather_df = generate_weather_data(
        start_time="2026-10-01T00:00:00Z",
        periods=96,
        interval_minutes=15,
        site_ids=("SITE_001", "SITE_002"),
        seed=42,
    )

    print("Weather records:", len(weather_df))

    # --------------------------------------------------
    # 2. Generate normal generation data
    # --------------------------------------------------

    generation_df = generate_generation_data(
        weather_df=weather_df, seed=42, interval_minutes=15
    )

    print("Normal generation records:", len(generation_df))

    assert len(generation_df) == 768

    # Preserve original data for comparison.
    original_df = generation_df.copy(deep=True)

    # --------------------------------------------------
    # 3. Test normal anomaly rate (0.5%)
    # --------------------------------------------------

    anomaly_df = inject_anomalies(
        generation_df=generation_df, anomaly_rate=0.005, seed=42
    )

    expected_anomaly_count = int(len(generation_df) * 0.005)

    # Identify changed records.
    changed_mask = (
        (original_df["dc_power_kw"] != anomaly_df["dc_power_kw"])
        | (original_df["ac_power_kw"] != anomaly_df["ac_power_kw"])
        | (original_df["energy_kwh"] != anomaly_df["energy_kwh"])
        | (
            original_df["grid_voltage_v"].fillna(-999)
            != anomaly_df["grid_voltage_v"].fillna(-999)
        )
    )

    actual_anomaly_count = int(changed_mask.sum())

    print("\nExpected anomalies:", expected_anomaly_count)
    print("Actual anomalies:", actual_anomaly_count)

    assert actual_anomaly_count == expected_anomaly_count

    print("Default anomaly rate: PASSED")

    # --------------------------------------------------
    # 4. Identify each anomaly type
    # --------------------------------------------------

    changed_records = anomaly_df.loc[changed_mask]

    original_changed = original_df.loc[changed_mask]

    dropout_mask = (
        original_changed["ac_power_kw"].gt(0)
        & changed_records["ac_power_kw"].eq(0)
        & changed_records["grid_voltage_v"].isna()
    )

    inverter_trip_mask = (
        original_changed["ac_power_kw"].gt(0)
        & changed_records["ac_power_kw"].eq(0)
        & changed_records["grid_voltage_v"].notna()
    )

    spike_mask = changed_records["grid_voltage_v"].between(460, 480)

    print("\nAnomaly distribution in normal run:")
    print("Dropouts:", int(dropout_mask.sum()))
    print("Inverter trips:", int(inverter_trip_mask.sum()))
    print("Voltage spikes:", int(spike_mask.sum()))

    # --------------------------------------------------
    # 5. Verify dropout behavior
    # --------------------------------------------------

    dropout_records = changed_records.loc[dropout_mask]

    if not dropout_records.empty:

        assert (dropout_records["dc_power_kw"] == 0).all()
        assert (dropout_records["ac_power_kw"] == 0).all()
        assert (dropout_records["energy_kwh"] == 0).all()
        assert dropout_records["grid_voltage_v"].isna().all()

    print("\nDropout behavior: PASSED")

    # --------------------------------------------------
    # 6. Verify inverter trip behavior
    # --------------------------------------------------

    trip_records = changed_records.loc[inverter_trip_mask]

    if not trip_records.empty:

        assert (trip_records["dc_power_kw"] == 0).all()
        assert (trip_records["ac_power_kw"] == 0).all()
        assert (trip_records["energy_kwh"] == 0).all()
        assert trip_records["grid_voltage_v"].notna().all()

    print("Inverter trip behavior: PASSED")

    # --------------------------------------------------
    # 7. Verify voltage spike behavior
    # --------------------------------------------------

    spike_records = changed_records.loc[spike_mask]

    if not spike_records.empty:

        assert spike_records["grid_voltage_v"].between(460, 480).all()

        # Generation values should remain unchanged.
        assert (
            spike_records["ac_power_kw"]
            == original_df.loc[spike_records.index, "ac_power_kw"]
        ).all()

        assert (
            spike_records["dc_power_kw"]
            == original_df.loc[spike_records.index, "dc_power_kw"]
        ).all()

        assert (
            spike_records["energy_kwh"]
            == original_df.loc[spike_records.index, "energy_kwh"]
        ).all()

    print("Voltage spike behavior: PASSED")

    # --------------------------------------------------
    # 8. Controlled stress test
    # --------------------------------------------------

    stress_df = inject_anomalies(generation_df=generation_df, anomaly_rate=1.0, seed=42)

    eligible_mask = generation_df["ac_power_kw"] > 0

    eligible_count = int(eligible_mask.sum())

    stress_changed_mask = (
        (generation_df["dc_power_kw"] != stress_df["dc_power_kw"])
        | (generation_df["ac_power_kw"] != stress_df["ac_power_kw"])
        | (generation_df["energy_kwh"] != stress_df["energy_kwh"])
        | (
            generation_df["grid_voltage_v"].fillna(-999)
            != stress_df["grid_voltage_v"].fillna(-999)
        )
    )

    assert int(stress_changed_mask.sum()) == eligible_count

    stress_original = generation_df.loc[stress_changed_mask]
    stress_anomalies = stress_df.loc[stress_changed_mask]

    stress_dropout = (
        stress_original["ac_power_kw"].gt(0)
        & stress_anomalies["ac_power_kw"].eq(0)
        & stress_anomalies["grid_voltage_v"].isna()
    )

    stress_trip = (
        stress_original["ac_power_kw"].gt(0)
        & stress_anomalies["ac_power_kw"].eq(0)
        & stress_anomalies["grid_voltage_v"].notna()
    )

    stress_spike = stress_anomalies["grid_voltage_v"].between(460, 480)

    print("\nStress test results:")
    print("Eligible records:", eligible_count)
    print("Dropouts:", int(stress_dropout.sum()))
    print("Inverter trips:", int(stress_trip.sum()))
    print("Voltage spikes:", int(stress_spike.sum()))

    # All three types must appear in this deterministic stress test.
    assert stress_dropout.any()
    assert stress_trip.any()
    assert stress_spike.any()

    # Every selected record must belong to exactly one type.
    classified_count = (
        int(stress_dropout.sum()) + int(stress_trip.sum()) + int(stress_spike.sum())
    )

    assert classified_count == eligible_count

    print("All three anomaly types: PASSED")

    # --------------------------------------------------
    # 9. Verify nighttime / zero-power records unchanged
    # --------------------------------------------------

    non_eligible_mask = ~eligible_mask

    pd.testing.assert_frame_equal(
        generation_df.loc[non_eligible_mask], stress_df.loc[non_eligible_mask]
    )

    print("Non-eligible records unchanged: PASSED")

    # --------------------------------------------------
    # 10. Verify original DataFrame was not modified
    # --------------------------------------------------

    pd.testing.assert_frame_equal(generation_df, original_df)

    print("Original DataFrame unchanged: PASSED")

    # --------------------------------------------------
    # 11. Verify deterministic output
    # --------------------------------------------------

    repeated_df = inject_anomalies(
        generation_df=generation_df, anomaly_rate=0.005, seed=42
    )

    pd.testing.assert_frame_equal(anomaly_df, repeated_df)

    print("Reproducibility: PASSED")

    # --------------------------------------------------
    # 12. Verify zero anomaly rate
    # --------------------------------------------------

    unchanged_df = inject_anomalies(
        generation_df=generation_df, anomaly_rate=0, seed=42
    )

    pd.testing.assert_frame_equal(generation_df, unchanged_df)

    print("Zero anomaly rate: PASSED")

    # --------------------------------------------------
    # 13. Verify invalid anomaly rates
    # --------------------------------------------------

    for invalid_rate in [-0.1, 1.1]:

        try:
            inject_anomalies(generation_df=generation_df, anomaly_rate=invalid_rate)

            raise AssertionError(f"Invalid anomaly rate {invalid_rate} was accepted.")

        except ValueError:
            pass

    print("Invalid anomaly rates: PASSED")

    # --------------------------------------------------
    # 14. Display sample anomalies
    # --------------------------------------------------

    print("\nSample injected anomalies:")

    print(
        changed_records[
            [
                "site_id",
                "inverter_id",
                "dc_power_kw",
                "ac_power_kw",
                "energy_kwh",
                "grid_voltage_v",
            ]
        ].to_string(index=False)
    )

    print("\n========== ALL TESTS PASSED ==========\n")


if __name__ == "__main__":
    test_anomaly_generator()
