import numpy as np
import pandas as pd


def validate_dataset(df, dataset_type="generation"):

    errors = []

    if dataset_type not in {"weather", "generation", "anomalies"}:
        return {
            "passed": False,
            "total_records": len(df),
            "errors": [f"Unsupported dataset type: {dataset_type}"],
        }

    if df.empty:
        return {"passed": False, "total_records": 0, "errors": ["Dataset is empty."]}

    if dataset_type == "weather":

        required_columns = {
            "timestamp",
            "site_id",
            "irradiance_w_m2",
            "ambient_temp_c",
            "module_temp_c",
            "cloud_cover_pct",
        }

        key_columns = ["timestamp", "site_id"]

        numeric_columns = [
            "irradiance_w_m2",
            "ambient_temp_c",
            "module_temp_c",
            "cloud_cover_pct",
        ]

    else:

        required_columns = {
            "timestamp",
            "site_id",
            "inverter_id",
            "dc_power_kw",
            "ac_power_kw",
            "energy_kwh",
            "grid_voltage_v",
            "power_factor",
        }

        key_columns = ["timestamp", "site_id", "inverter_id"]

        numeric_columns = [
            "dc_power_kw",
            "ac_power_kw",
            "energy_kwh",
            "grid_voltage_v",
            "power_factor",
        ]

    # 1. Check required columns
    missing = required_columns - set(df.columns)

    if missing:
        errors.append(f"Missing columns: {missing}")

    if errors:
        return {"passed": False, "total_records": len(df), "errors": errors}

    # 2. Check missing identifiers and timestamps
    for column in key_columns:

        if df[column].isna().any():
            errors.append(f"Missing values in {column}.")

        elif df[column].astype(str).str.strip().eq("").any():
            errors.append(f"Empty values in {column}.")

    # 3. Check duplicate records
    duplicates = df.duplicated(subset=key_columns).sum()

    if duplicates:
        errors.append(f"{duplicates} duplicate records found.")

    # 4. Check numeric values
    for column in numeric_columns:

        values = pd.to_numeric(df[column], errors="coerce")

        invalid = (values.notna() & ~np.isfinite(values)).sum()

        if invalid:
            errors.append(f"{invalid} infinite values found in {column}.")

        invalid_format = (df[column].notna() & values.isna()).sum()

        if invalid_format:
            errors.append(f"{invalid_format} invalid numeric values in {column}.")

    # 5. Dataset-specific validation
    if dataset_type == "weather":

        if (df["irradiance_w_m2"].dropna() < 0).any():
            errors.append("Negative irradiance detected.")

        if (
            (df["cloud_cover_pct"].dropna() < 0)
            | (df["cloud_cover_pct"].dropna() > 100)
        ).any():
            errors.append("Cloud cover must be between 0 and 100.")

    else:

        for column in ["dc_power_kw", "ac_power_kw", "energy_kwh"]:

            if (df[column].dropna() < 0).any():
                errors.append(f"Negative values detected in {column}.")

        if (
            (df["power_factor"].dropna() < 0) | (df["power_factor"].dropna() > 1)
        ).any():
            errors.append("Power factor must be between 0 and 1.")

        # Missing voltage is allowed only for injected dropouts.
        if dataset_type == "generation" and df["grid_voltage_v"].isna().any():
            errors.append("Missing grid voltage detected in normal generation data.")

    # 6. Anomaly summary (report only, do not reject intentional anomalies)
    if dataset_type == "anomalies":

        dropout_count = df["grid_voltage_v"].isna().sum()

        zero_power_count = (df["ac_power_kw"] == 0).sum()

        voltage_spike_count = (df["grid_voltage_v"] > 450).sum()

        low_voltage_count = (df["grid_voltage_v"] < 380).sum()

        print(
            "-> [Anomaly Summary] "
            f"Missing voltage: {dropout_count}, "
            f"Zero-power readings: {zero_power_count}, "
            f"High-voltage readings: {voltage_spike_count}, "
            f"Low-voltage readings: {low_voltage_count}."
        )

    passed = len(errors) == 0

    for error in errors:
        print(f"Validation Error: {error}")

    return {"passed": passed, "total_records": len(df), "errors": errors}
