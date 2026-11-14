import numpy as np
import pandas as pd

from decimal import Decimal, ROUND_HALF_UP


DEFAULT_INVERTERS = {
    "SITE_001": ["INV_01", "INV_02", "INV_03", "INV_04"],
    "SITE_002": ["INV_01", "INV_02", "INV_03", "INV_04"],
}

DEFAULT_SITE_CAPACITIES = {"SITE_001": 500.0, "SITE_002": 750.0}


def calculate_interval_energy(ac_power_kw, interval_minutes):
    """
    Calculate energy produced during an interval.

    Uses decimal arithmetic and ROUND_HALF_UP to avoid
    inconsistent floating-point rounding.
    """

    energy = Decimal(str(ac_power_kw)) * Decimal(str(interval_minutes)) / Decimal("60")

    return float(energy.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def generate_generation_data(
    weather_df, inverter_ids=None, site_capacities=None, seed=42, interval_minutes=15
):
    """
    Generate inverter generation observations using weather data.

    One generation record is generated for every inverter
    at each site and weather timestamp.
    """

    # --------------------------------------------------
    # 1. Validate inputs
    # --------------------------------------------------

    if interval_minutes <= 0:
        raise ValueError("Interval must be positive.")

    if weather_df.empty:
        return pd.DataFrame()

    required_columns = {"timestamp", "site_id", "irradiance_w_m2", "module_temp_c"}

    missing_columns = required_columns - set(weather_df.columns)

    if missing_columns:
        raise ValueError(f"Missing required weather columns: {missing_columns}")

    if weather_df[list(required_columns)].isnull().any().any():
        raise ValueError("Weather data contains missing required values.")

    if weather_df.duplicated(subset=["timestamp", "site_id"]).any():
        raise ValueError("Duplicate weather records found for a site and timestamp.")

    inverter_ids = DEFAULT_INVERTERS if inverter_ids is None else inverter_ids

    site_capacities = (
        DEFAULT_SITE_CAPACITIES if site_capacities is None else site_capacities
    )

    if not inverter_ids:
        raise ValueError("At least one inverter configuration is required.")

    for site_id, site_inverters in inverter_ids.items():

        if not site_inverters:
            raise ValueError(f"No inverters configured for {site_id}")

        if len(set(site_inverters)) != len(site_inverters):
            raise ValueError(f"Duplicate inverter IDs found for {site_id}")

        if site_id not in site_capacities:
            raise ValueError(f"No capacity configured for {site_id}")

        capacity = float(site_capacities[site_id])

        if not np.isfinite(capacity) or capacity <= 0:
            raise ValueError(f"Invalid site capacity for {site_id}")

    # --------------------------------------------------
    # 2. Initialize random generator
    # --------------------------------------------------

    rng = np.random.default_rng(seed)

    records = []

    # --------------------------------------------------
    # 3. Generate inverter readings
    # --------------------------------------------------

    for _, row in weather_df.iterrows():

        site_id = row["site_id"]

        if site_id not in inverter_ids:
            raise ValueError(f"No inverters configured for {site_id}")

        if site_id not in site_capacities:
            raise ValueError(f"No capacity configured for {site_id}")

        irradiance = float(row["irradiance_w_m2"])
        module_temp = float(row["module_temp_c"])

        if not np.isfinite(irradiance) or irradiance < 0:
            raise ValueError(f"Invalid irradiance for {site_id}")

        if not np.isfinite(module_temp):
            raise ValueError(f"Invalid module temperature for {site_id}")

        site_inverters = inverter_ids[site_id]

        # --------------------------------------------------
        # 4. Calculate individual inverter capacity
        # --------------------------------------------------

        inverter_capacity = float(site_capacities[site_id]) / len(site_inverters)

        for inverter_id in site_inverters:

            # --------------------------------------------------
            # 5. Temperature derating
            # --------------------------------------------------

            temperature_coefficient = -0.004

            temp_derate = 1 + temperature_coefficient * (module_temp - 25)

            temp_derate = max(0, temp_derate)

            # --------------------------------------------------
            # 6. Calculate DC power
            # --------------------------------------------------

            dc_power = inverter_capacity * (irradiance / 1000) * temp_derate

            dc_power = max(0, dc_power)

            # --------------------------------------------------
            # 7. Convert DC power to AC power
            # --------------------------------------------------

            inverter_efficiency = 0.96

            ac_power = dc_power * inverter_efficiency

            # Maximum AC output.
            ac_limit = inverter_capacity * 0.85

            ac_power = min(ac_power, ac_limit)

            # --------------------------------------------------
            # 8. Add measurement noise
            # --------------------------------------------------

            if dc_power > 0:
                ac_power += rng.normal(0, 2)

            ac_power = min(ac_limit, max(0, ac_power))

            ac_power = round(ac_power, 2)

            # --------------------------------------------------
            # 9. Calculate interval energy
            # --------------------------------------------------

            energy_kwh = calculate_interval_energy(ac_power, interval_minutes)

            # --------------------------------------------------
            # 10. Generate electrical measurements
            # --------------------------------------------------

            grid_voltage = round(rng.normal(415, 2.5), 1)

            power_factor = round(rng.uniform(0.95, 0.99), 2)

            # --------------------------------------------------
            # 11. Store generation record
            # --------------------------------------------------

            records.append(
                {
                    "timestamp": row["timestamp"],
                    "site_id": site_id,
                    "inverter_id": inverter_id,
                    "dc_power_kw": round(dc_power, 2),
                    "ac_power_kw": ac_power,
                    "energy_kwh": energy_kwh,
                    "grid_voltage_v": grid_voltage,
                    "power_factor": power_factor,
                }
            )

    return pd.DataFrame(records)
