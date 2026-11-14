import numpy as np
import pandas as pd


# Both solar sites are located in India.
# Weather timestamps are stored in UTC, but daylight calculations
# use Indian Standard Time (UTC + 5:30).
IST_OFFSET = pd.Timedelta(hours=5, minutes=30)


def generate_weather_data(
    start_time="2026-10-01T00:00:00Z",
    days=30,
    interval_minutes=15,
    site_ids=("SITE_001", "SITE_002"),
    seed=42,
    periods=None,
):
    """
    Generate synthetic weather observations for multiple solar sites.

    Features:
    - One weather record per site per timestamp.
    - Timestamps are stored in UTC.
    - Daylight calculations use IST (UTC + 5:30).
    - Random seed ensures reproducible output.
    """

    # --------------------------------------------------
    # 1. Validate inputs
    # --------------------------------------------------

    if interval_minutes <= 0:
        raise ValueError("Interval must be positive.")

    if days <= 0:
        raise ValueError("Days must be positive.")

    if not site_ids:
        raise ValueError("At least one site ID must be provided.")

    if len(set(site_ids)) != len(site_ids):
        raise ValueError("Duplicate site IDs are not allowed.")

    if periods is None:
        periods = days * 24 * 60 // interval_minutes

    if periods <= 0:
        raise ValueError("Periods must be positive.")

    # --------------------------------------------------
    # 2. Initialize random generator
    # --------------------------------------------------

    rng = np.random.default_rng(seed)

    # --------------------------------------------------
    # 3. Generate UTC timestamps
    # --------------------------------------------------

    timestamps = pd.date_range(
        start=start_time, periods=periods, freq=f"{interval_minutes}min"
    )

    # Ensure timestamps are timezone-aware UTC.
    if timestamps.tz is None:
        timestamps = timestamps.tz_localize("UTC")
    else:
        timestamps = timestamps.tz_convert("UTC")

    records = []

    # --------------------------------------------------
    # 4. Generate weather observations for each site
    # --------------------------------------------------

    for site_index, site_id in enumerate(site_ids):

        # Slight temperature variation between sites.
        site_offset = site_index * 1.5

        for timestamp in timestamps:

            # Convert UTC timestamp to IST for daylight calculation.
            local_timestamp = timestamp + IST_OFFSET

            hour = local_timestamp.hour + local_timestamp.minute / 60

            # --------------------------------------------------
            # 5. Calculate approximate daylight
            # --------------------------------------------------

            if 6 < hour < 18:
                daylight = max(0, np.sin(np.pi * (hour - 6) / 12))
            else:
                daylight = 0

            # --------------------------------------------------
            # 6. Generate cloud cover and irradiance
            # --------------------------------------------------

            cloud_cover = rng.uniform(10, 60)

            clear_sky_irradiance = 950 * daylight

            cloud_factor = 1 - (cloud_cover / 100) * 0.7

            if daylight == 0:
                irradiance = 0.0
            else:
                irradiance = max(
                    0, clear_sky_irradiance * cloud_factor + rng.normal(0, 15)
                )

            # --------------------------------------------------
            # 7. Generate temperature readings
            # --------------------------------------------------

            ambient_temp = 27 + 6 * daylight + site_offset + rng.normal(0, 1.5)

            module_temp = ambient_temp + irradiance * 0.025 + rng.normal(0, 1)

            # --------------------------------------------------
            # 8. Store observation
            # --------------------------------------------------

            records.append(
                {
                    "timestamp": timestamp,
                    "site_id": site_id,
                    "irradiance_w_m2": round(irradiance, 2),
                    "ambient_temp_c": round(ambient_temp, 2),
                    "module_temp_c": round(module_temp, 2),
                    "cloud_cover_pct": round(cloud_cover, 2),
                }
            )

    # --------------------------------------------------
    # 9. Return weather DataFrame
    # --------------------------------------------------

    return pd.DataFrame(records)
