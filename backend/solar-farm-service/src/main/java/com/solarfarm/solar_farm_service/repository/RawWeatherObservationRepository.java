package com.solarfarm.solar_farm_service.repository;

import com.solarfarm.solar_farm_service.entity.raw.RawWeatherObservation;
import com.solarfarm.solar_farm_service.entity.raw.RawWeatherObservationId;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface RawWeatherObservationRepository
    extends JpaRepository<RawWeatherObservation, RawWeatherObservationId> {

  List<RawWeatherObservation> findByTimestampBetweenOrderByTimestampAsc(
      LocalDateTime startTime, LocalDateTime endTime);

  List<RawWeatherObservation> findBySiteIdAndTimestampBetweenOrderByTimestampAsc(
      String siteId, LocalDateTime startTime, LocalDateTime endTime);

  List<RawWeatherObservation>
      findByTimestampGreaterThanEqualAndTimestampLessThanOrderByTimestampAsc(
          LocalDateTime startTime, LocalDateTime endTime);

  @Query(
      """
    SELECT r
    FROM RawWeatherObservation r
    WHERE NOT EXISTS (
        SELECT c.id
        FROM WeatherObservation c
        WHERE c.timestamp = r.timestamp
          AND c.siteId = r.siteId
    )
    ORDER BY r.timestamp ASC
""")
  List<RawWeatherObservation> findPendingWeatherRecords();
}
