package com.solarfarm.solar_farm_service.repository;

import com.solarfarm.solar_farm_service.entity.raw.RawInverterGeneration;
import com.solarfarm.solar_farm_service.entity.raw.RawInverterGenerationId;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface RawInverterGenerationRepository
    extends JpaRepository<RawInverterGeneration, RawInverterGenerationId> {

  List<RawInverterGeneration> findByTimestampBetweenOrderByTimestampAsc(
      LocalDateTime startTime, LocalDateTime endTime);

  List<RawInverterGeneration> findBySiteIdAndTimestampBetweenOrderByTimestampAsc(
      String siteId, LocalDateTime startTime, LocalDateTime endTime);

  List<RawInverterGeneration>
      findByTimestampGreaterThanEqualAndTimestampLessThanOrderByTimestampAsc(
          LocalDateTime startTime, LocalDateTime endTime);

  @Query(
      """
    SELECT r
    FROM RawInverterGeneration r
    WHERE NOT EXISTS (
        SELECT c.id
        FROM InverterGeneration c
        WHERE c.timestamp = r.timestamp
          AND c.siteId = r.siteId
          AND c.inverterId = r.inverterId
    )
    ORDER BY r.timestamp ASC
""")
  List<RawInverterGeneration> findPendingGenerationRecords();
}
