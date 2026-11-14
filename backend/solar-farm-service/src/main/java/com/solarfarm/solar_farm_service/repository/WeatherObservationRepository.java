package com.solarfarm.solar_farm_service.repository;

import com.solarfarm.solar_farm_service.entity.WeatherObservation;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface WeatherObservationRepository extends JpaRepository<WeatherObservation, Long> {

  List<WeatherObservation> findBySiteId(String siteId);

  List<WeatherObservation> findBySiteIdAndTimestampBetween(
      String siteId, LocalDateTime start, LocalDateTime end);

  @Query("SELECT DISTINCT w.siteId FROM WeatherObservation w ORDER BY w.siteId ASC")
  List<String> findDistinctSiteIds();

  List<WeatherObservation> findByTimestampBetween(LocalDateTime start, LocalDateTime end);

  boolean existsByTimestampAndSiteId(LocalDateTime timestamp, String siteId);

  Optional<WeatherObservation> findBySiteIdAndTimestamp(String siteId, LocalDateTime timestamp);
}
