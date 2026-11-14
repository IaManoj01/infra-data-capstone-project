package com.solarfarm.solar_farm_service.repository;

import com.solarfarm.solar_farm_service.entity.FaultTicket;
import com.solarfarm.solar_farm_service.entity.TicketStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FaultTicketRepository extends JpaRepository<FaultTicket, Long> {

  List<FaultTicket> findByStatus(TicketStatus status);

  List<FaultTicket> findByStatusIn(List<TicketStatus> statuses);

  List<FaultTicket> findBySiteId(String siteId);

  List<FaultTicket> findBySiteIdOrderByTimestampDesc(String siteId);

  List<FaultTicket> findBySiteIdAndInverterId(String siteId, String inverterId);

  List<FaultTicket> findBySiteIdAndStatus(String siteId, TicketStatus status);

  List<FaultTicket> findBySiteIdAndInverterIdAndStatus(
      String siteId, String inverterId, TicketStatus status);

  List<FaultTicket> findAllByOrderByTimestampDesc();

  boolean existsBySiteIdAndInverterIdAndFaultTypeAndStatusIn(
      String siteId, String inverterId, String faultType, List<TicketStatus> statuses);
}
