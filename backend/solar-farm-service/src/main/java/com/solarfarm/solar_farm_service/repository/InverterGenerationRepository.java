package com.solarfarm.solar_farm_service.repository;

import com.solarfarm.solar_farm_service.entity.InverterGeneration;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface InverterGenerationRepository extends JpaRepository<InverterGeneration, Long> {

  List<InverterGeneration> findByInverterId(String inverterId);

  List<InverterGeneration> findBySiteId(String siteId);

  List<InverterGeneration> findBySiteIdAndInverterId(String siteId, String inverterId);

  List<InverterGeneration> findBySiteIdAndTimestampBetween(
      String siteId, LocalDateTime start, LocalDateTime end);

  List<InverterGeneration> findByInverterIdAndTimestampBetween(
      String inverterId, LocalDateTime start, LocalDateTime end);

  List<InverterGeneration> findByStatusFlag(String statusFlag);

  @Query("SELECT DISTINCT i.siteId FROM InverterGeneration i ORDER BY i.siteId ASC")
  List<String> findDistinctSiteIds();

  boolean existsByTimestampAndSiteIdAndInverterId(
      LocalDateTime timestamp, String siteId, String inverterId);

  @Query("SELECT MAX(i.timestamp) FROM InverterGeneration i")
  LocalDateTime findMaxTimestamp();
}
