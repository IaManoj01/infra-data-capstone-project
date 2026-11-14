// package com.solarfarm.solar_farm_service.service;
//
// import com.solarfarm.solar_farm_service.entity.InverterGeneration;
// import com.solarfarm.solar_farm_service.entity.WeatherObservation;
// import com.solarfarm.solar_farm_service.entity.raw.RawInverterGeneration;
// import com.solarfarm.solar_farm_service.entity.raw.RawWeatherObservation;
// import com.solarfarm.solar_farm_service.repository.InverterGenerationRepository;
// import com.solarfarm.solar_farm_service.repository.RawInverterGenerationRepository;
// import com.solarfarm.solar_farm_service.repository.RawWeatherObservationRepository;
// import com.solarfarm.solar_farm_service.repository.WeatherObservationRepository;
// import org.junit.jupiter.api.Test;
// import org.junit.jupiter.api.extension.ExtendWith;
// import org.mockito.InjectMocks;
// import org.mockito.Mock;
// import org.mockito.junit.jupiter.MockitoExtension;
//
// import java.time.LocalDateTime;
// import java.util.List;
//
// import static org.mockito.ArgumentMatchers.argThat;
// import static org.mockito.Mockito.verify;
// import static org.mockito.Mockito.when;
//
// @ExtendWith(MockitoExtension.class)
// class DataTransformationServiceTest {
//
//    @Mock
//    private RawInverterGenerationRepository rawGenRepo;
//    @Mock
//    private InverterGenerationRepository cleanGenRepo;
//    @Mock
//    private RawWeatherObservationRepository rawWeatherRepo;
//    @Mock
//    private WeatherObservationRepository cleanWeatherRepo;
//
//    @InjectMocks
//    private DataTransformationService service;
//
//    @Test
//    void processesOnlyMissingSiteTimestampKeysWhenLatestTimestampIsRepeated() {
//        LocalDateTime timestamp = LocalDateTime.of(2026, 11, 10, 12, 0);
//        when(cleanGenRepo.findMaxTimestamp()).thenReturn(timestamp);
//        when(rawGenRepo.findByTimestampGreaterThanEqual(timestamp)).thenReturn(List.of(
//                generation("SITE_001", timestamp),
//                generation("SITE_002", timestamp)
//        ));
//        when(cleanGenRepo.findByTimestampIn(List.of(timestamp))).thenReturn(List.of(
//                cleanGeneration("SITE_001", timestamp)
//        ));
//
//        when(cleanWeatherRepo.findMaxTimestamp()).thenReturn(timestamp);
//        when(rawWeatherRepo.findByTimestampGreaterThanEqual(timestamp)).thenReturn(List.of(
//                weather("SITE_001", timestamp),
//                weather("SITE_002", timestamp)
//        ));
//        when(cleanWeatherRepo.findByTimestampIn(List.of(timestamp))).thenReturn(List.of(
//                cleanWeather("SITE_001", timestamp)
//        ));
//
//        service.cleanAndTransformData();
//
//        verify(cleanGenRepo).saveAll(argThat(records -> {
//            var iterator = records.iterator();
//            return iterator.hasNext()
//                    && "SITE_002".equals(iterator.next().getInverterId())
//                    && !iterator.hasNext();
//        }));
//        verify(cleanWeatherRepo).saveAll(argThat(records -> {
//            var iterator = records.iterator();
//            return iterator.hasNext()
//                    && "SITE_002".equals(iterator.next().getSiteId())
//                    && !iterator.hasNext();
//        }));
//    }
//
//    @Test
//    void ignoresRepeatedRawRecordsWithTheSameSiteAndTimestamp() {
//        LocalDateTime timestamp = LocalDateTime.of(2026, 11, 10, 12, 0);
//        when(cleanGenRepo.findMaxTimestamp()).thenReturn(null);
//        when(rawGenRepo.findAll()).thenReturn(List.of(
//                generation("SITE_001", timestamp),
//                generation("SITE_001", timestamp)
//        ));
//        when(cleanWeatherRepo.findMaxTimestamp()).thenReturn(null);
//        when(rawWeatherRepo.findAll()).thenReturn(List.of(
//                weather("SITE_001", timestamp),
//                weather("SITE_001", timestamp)
//        ));
//
//        service.cleanAndTransformData();
//
//        verify(cleanGenRepo).saveAll(argThat(records -> {
//            var iterator = records.iterator();
//            return iterator.hasNext() && iterator.next() != null && !iterator.hasNext();
//        }));
//        verify(cleanWeatherRepo).saveAll(argThat(records -> {
//            var iterator = records.iterator();
//            return iterator.hasNext() && iterator.next() != null && !iterator.hasNext();
//        }));
//    }
//
//    private static RawInverterGeneration generation(String siteId, LocalDateTime timestamp) {
//        return new RawInverterGeneration(timestamp, siteId, 100.0, 96.0, 24.0, 415.0, 0.98);
//    }
//
//    private static InverterGeneration cleanGeneration(String siteId, LocalDateTime timestamp) {
//        InverterGeneration generation = new InverterGeneration();
//        generation.setInverterId(siteId);
//        generation.setTimestamp(timestamp);
//        return generation;
//    }
//
//    private static RawWeatherObservation weather(String siteId, LocalDateTime timestamp) {
//        return new RawWeatherObservation(timestamp, siteId, 900.0, 25.0, 30.0, 20.0);
//    }
//
//    private static WeatherObservation cleanWeather(String siteId, LocalDateTime timestamp) {
//        WeatherObservation observation = new WeatherObservation();
//        observation.setSiteId(siteId);
//        observation.setTimestamp(timestamp);
//        return observation;
//    }
// }
