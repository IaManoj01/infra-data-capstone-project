import numpy as np
import pandas as pd


ANOMALY_TYPES = ("dropout", "inverter_trip", "spike")


def inject_anomalies(generation_df, anomaly_rate=0.005, seed=42):
    """
    Inject synthetic anomalies into inverter generation data.

    Supported anomalies:
    1. dropout      - power becomes zero and voltage becomes NULL.
    2. inverter_trip - power becomes zero, voltage remains available.
    3. spike        - grid voltage increases to 460-480 V.

    Only records with positive AC power are eligible.

    The anomaly rate is calculated against the total number
    of input generation records.

    The original DataFrame is never modified.
    """

    # --------------------------------------------------
    # 1. Validate anomaly rate
    # --------------------------------------------------

    if not 0 <= anomaly_rate <= 1:
        raise ValueError("Anomaly rate must be between 0 and 1.")

    # --------------------------------------------------
    # 2. Handle empty input
    # --------------------------------------------------

    if generation_df.empty or anomaly_rate == 0:
        return generation_df.copy()

    # --------------------------------------------------
    # 3. Validate required columns
    # --------------------------------------------------

    required_columns = {"dc_power_kw", "ac_power_kw", "energy_kwh", "grid_voltage_v"}

    missing_columns = required_columns - set(generation_df.columns)

    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")

    if not generation_df.index.is_unique:
        raise ValueError("Generation DataFrame must have a unique index.")

    # --------------------------------------------------
    # 4. Create a copy
    # --------------------------------------------------

    df = generation_df.copy()

    # --------------------------------------------------
    # 5. Identify eligible records
    # --------------------------------------------------

    eligible_indices = df.index[
        df["ac_power_kw"].notna() & (df["ac_power_kw"] > 0)
    ].to_numpy()

    if len(eligible_indices) == 0:
        return df

    # --------------------------------------------------
    # 6. Calculate number of anomalies
    # --------------------------------------------------

    anomaly_count = int(len(df) * anomaly_rate)

    # Never select more rows than are eligible.
    anomaly_count = min(anomaly_count, len(eligible_indices))

    if anomaly_count == 0:
        return df

    # --------------------------------------------------
    # 7. Initialize random generator
    # --------------------------------------------------

    rng = np.random.default_rng(seed)

    # Select different records without replacement.
    anomaly_indices = rng.choice(eligible_indices, size=anomaly_count, replace=False)

    # --------------------------------------------------
    # 8. Inject anomalies
    # --------------------------------------------------

    for idx in anomaly_indices:

        anomaly_type = rng.choice(ANOMALY_TYPES)

        if anomaly_type == "dropout":

            # Simulate missing inverter telemetry.
            df.loc[idx, ["dc_power_kw", "ac_power_kw", "energy_kwh"]] = 0.0

            # Missing grid voltage measurement.
            df.loc[idx, "grid_voltage_v"] = np.nan

        elif anomaly_type == "inverter_trip":

            # Simulate inverter stopping production.
            df.loc[idx, ["dc_power_kw", "ac_power_kw", "energy_kwh"]] = 0.0

            # Voltage remains available.

        elif anomaly_type == "spike":

            # Simulate abnormal grid voltage.
            df.loc[idx, "grid_voltage_v"] = round(rng.uniform(460, 480), 1)

    return df
