import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { AttributionControl, LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { StyleSheet, Text, View } from "react-native";

import type { Coordinate, MapMarker } from "../../domain/types";
import { useI18n } from "../../i18n/useI18n";
import { colors, radius, spacing } from "../../styles/theme";
import { fallbackCoordinate, mapLibreStyle, pinColors } from "./mapLibreStyle";

type MapPanelProps = {
  coordinate?: Coordinate | null;
  markers?: MapMarker[];
  points?: Coordinate[];
};

type RouteSource = {
  setData: (data: GeoJSON.FeatureCollection) => void;
};

const routeSourceId = "tracked-route-source";
const routeLayerId = "tracked-route-line";

function markerColor(marker: MapMarker) {
  return pinColors[marker.tone ?? "destination"];
}

function toLngLat(coordinate: Coordinate): [number, number] {
  return [coordinate.lng, coordinate.lat];
}

function routeGeoJson(points: Coordinate[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features:
      points.length > 1
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: points.map(toLngLat)
              }
            }
          ]
        : []
  };
}

function createDestinationPin(color: string) {
  const element = document.createElement("div");
  element.style.alignItems = "center";
  element.style.display = "flex";
  element.style.flexDirection = "column";
  element.style.height = "36px";
  element.style.justifyContent = "center";
  element.style.width = "28px";

  const head = document.createElement("div");
  head.style.background = color;
  head.style.border = "3px solid #FFFFFF";
  head.style.borderRadius = "13px";
  head.style.boxSizing = "border-box";
  head.style.height = "26px";
  head.style.width = "26px";

  const tail = document.createElement("div");
  tail.style.background = color;
  tail.style.borderBottomRightRadius = "2px";
  tail.style.height = "11px";
  tail.style.marginTop = "-9px";
  tail.style.transform = "rotate(45deg)";
  tail.style.width = "11px";

  element.append(head, tail);
  return element;
}

function createCurrentPin() {
  const element = document.createElement("div");
  element.style.alignItems = "center";
  element.style.background = "rgba(14, 165, 233, 0.22)";
  element.style.border = "2px solid #7DD3FC";
  element.style.borderRadius = "18px";
  element.style.boxSizing = "border-box";
  element.style.display = "flex";
  element.style.height = "36px";
  element.style.justifyContent = "center";
  element.style.width = "36px";

  const core = document.createElement("div");
  core.style.background = pinColors.current;
  core.style.border = "2px solid #FFFFFF";
  core.style.borderRadius = "7px";
  core.style.boxSizing = "border-box";
  core.style.height = "14px";
  core.style.width = "14px";

  element.append(core);
  return element;
}

function createPopupContent(marker: MapMarker) {
  const container = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = marker.title;
  container.append(title);

  if (marker.description) {
    const description = document.createElement("div");
    description.textContent = marker.description;
    container.append(description);
  }

  return container;
}

function fitMap(map: MapLibreMap, coordinates: Coordinate[]) {
  const first = coordinates[0];
  if (!first || coordinates.length < 2) {
    const center = first ?? fallbackCoordinate;
    map.easeTo({ center: toLngLat(center), duration: 450, zoom: 15 });
    return;
  }

  const bounds = coordinates.reduce(
    (current, item) => current.extend(toLngLat(item)),
    new LngLatBounds(toLngLat(first), toLngLat(first))
  );
  map.fitBounds(bounds, { duration: 450, padding: 42, maxZoom: 16 });
}

function updateRoute(map: MapLibreMap, points: Coordinate[]) {
  const data = routeGeoJson(points);

  if (!map.getSource(routeSourceId)) {
    map.addSource(routeSourceId, {
      type: "geojson",
      data
    });
    map.addLayer({
      id: routeLayerId,
      source: routeSourceId,
      type: "line",
      paint: {
        "line-color": "#0F766E",
        "line-opacity": 0.82,
        "line-width": 4
      }
    });
    return;
  }

  (map.getSource(routeSourceId) as unknown as RouteSource).setData(data);
}

export function MapPanel({ coordinate, markers = [], points = [] }: MapPanelProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const latest = coordinate ?? points[points.length - 1] ?? markers[0]?.coordinate;
  const plottedCoordinates = useMemo(
    () => [
      ...(coordinate ? [coordinate] : []),
      ...markers.map((marker) => marker.coordinate),
      ...points
    ],
    [coordinate, markers, points]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const center = latest ?? fallbackCoordinate;
    const map = new MapLibreMap({
      attributionControl: false,
      center: toLngLat(center),
      container: containerRef.current,
      style: mapLibreStyle,
      zoom: 15
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    map.on("load", () => {
      updateRoute(map, points);
      fitMap(map, plottedCoordinates.length ? plottedCoordinates : [center]);
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    if (coordinate) {
      markerRefs.current.push(
        new Marker({ anchor: "bottom", element: createCurrentPin() })
          .setLngLat(toLngLat(coordinate))
          .setPopup(new Popup({ offset: 18 }).setText(t("plans.origin")))
          .addTo(map)
      );
    }

    markers.forEach((marker) => {
      markerRefs.current.push(
        new Marker({ anchor: "bottom", element: createDestinationPin(markerColor(marker)) })
          .setLngLat(toLngLat(marker.coordinate))
          .setPopup(new Popup({ offset: 18 }).setDOMContent(createPopupContent(marker)))
          .addTo(map)
      );
    });

    fitMap(map, plottedCoordinates.length ? plottedCoordinates : [latest ?? fallbackCoordinate]);
  }, [coordinate, latest, markers, plottedCoordinates, t]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (map.loaded()) {
      updateRoute(map, points);
      return;
    }

    map.once("load", () => updateRoute(map, points));
  }, [points]);

  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>{t("map.title")}</Text>
      <Text style={styles.title}>
        {latest ? `${latest.lat.toFixed(6)}, ${latest.lng.toFixed(6)}` : t("map.noPosition")}
      </Text>
      <Text style={styles.meta}>{t("map.queuedPoints", { count: points.length })}</Text>
      <div ref={containerRef} style={webStyles.map} />
      {markers.length ? (
        <View style={styles.markerList}>
          {markers.map((marker) => (
            <View key={marker.id} style={styles.markerRow}>
              <View style={[styles.markerDot, { backgroundColor: markerColor(marker) }]} />
              <View style={styles.markerCopy}>
                <Text style={styles.markerTitle}>{marker.title}</Text>
                {marker.description ? <Text style={styles.markerMeta}>{marker.description}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const webStyles = {
  map: {
    borderRadius: radius.sm,
    height: 260,
    overflow: "hidden",
    width: "100%"
  }
} satisfies Record<string, CSSProperties>;

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    gap: spacing.sm,
    minHeight: 330,
    padding: spacing.lg
  },
  kicker: {
    color: "#B7E4DE",
    fontSize: 12,
    fontWeight: "800"
  },
  title: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "800"
  },
  meta: {
    color: "#C9D1D6",
    fontSize: 13
  },
  markerList: {
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  markerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  markerDot: {
    borderRadius: 6,
    height: 12,
    width: 12
  },
  markerCopy: {
    flex: 1
  },
  markerTitle: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800"
  },
  markerMeta: {
    color: "#C9D1D6",
    fontSize: 12,
    marginTop: 2
  }
});

export default MapPanel;
