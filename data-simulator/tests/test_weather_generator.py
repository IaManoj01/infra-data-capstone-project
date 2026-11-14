from src.generators.weather_generator import generate_weather_data


def test_weather_generator():

    print("\n========== WEATHER GENERATOR TEST ==========\n")

    # 1. Generate one day of weather observations.
    weather_df = generate_weather_data(
        start_time="2026-10-01T00:00:00Z",
        periods=96,
        interval_minutes=15,
        site_ids=("SITE_001", "SITE_002"),
        seed=42,
    )

    # 2. Validate record count.
    print("Total records:", len(weather_df))

    assert len(weather_df) == 192

    # 3. Validate columns.
    print("\nColumns:")
    print(weather_df.columns.tolist())

    # 4. Validate UTC timestamps.
    print("\nTimestamp timezone:")
    print(weather_df["timestamp"].dt.tz)

    assert str(weather_df["timestamp"].dt.tz) == "UTC"

    # 5. Display sample records.
    print("\nFirst 10 records:")
    print(weather_df.head(10).to_string(index=False))

    # 6. Convert UTC timestamps to IST for inspection.
    inspection_df = weather_df.copy()

    inspection_df["local_time"] = inspection_df["timestamp"].dt.tz_convert(
        "Asia/Kolkata"
    )

    inspection_df["local_hour"] = inspection_df["local_time"].dt.hour

    # 7. Display hourly irradiance averages.
    hourly_irradiance = inspection_df.groupby("local_hour")["irradiance_w_m2"].mean()

    print("\nAverage irradiance by IST hour:")
    print(hourly_irradiance.to_string())

    # 8. Classify records using actual daylight boundaries.
    decimal_hour = (
        inspection_df["local_hour"] + inspection_df["local_time"].dt.minute / 60
    )

    nighttime = inspection_df[(decimal_hour <= 6) | (decimal_hour >= 18)]

    daytime = inspection_df[(decimal_hour > 6) & (decimal_hour < 18)]

    print("\nNighttime average irradiance:")
    print(nighttime["irradiance_w_m2"].mean())

    print("\nDaytime average irradiance:")
    print(daytime["irradiance_w_m2"].mean())

    # 9. Validate irradiance.
    assert nighttime["irradiance_w_m2"].max() == 0

    assert daytime["irradiance_w_m2"].mean() > 0

    # 10. Check duplicate records.
    duplicates = weather_df.duplicated(subset=["timestamp", "site_id"]).sum()

    print("\nDuplicate records:", duplicates)

    assert duplicates == 0

    # 11. Check missing values.
    print("\nMissing values:")
    print(weather_df.isnull().sum())

    assert weather_df.isnull().sum().sum() == 0

    print("\n========== ALL TESTS PASSED ==========\n")


if __name__ == "__main__":
    test_weather_generator()
