import { Camera, GeoJSONSource, Layer, Map, Marker } from "@maplibre/maplibre-react-native";
import { StyleSheet, View } from "react-native";

import type { Coordinate, MapMarker } from "../../domain/types";
import { fallbackCoordinate, mapLibreStyle, pinColors } from "./mapLibreStyle";

type MapPanelProps = {
  coordinate?: Coordinate | null;
  markers?: MapMarker[];
  points?: Coordinate[];
};

type LngLat = [number, number];

function toLngLat(coordinate: Coordinate): LngLat {
  return [coordinate.lng, coordinate.lat];
}

function markerColor(marker: MapMarker) {
  return pinColors[marker.tone ?? "destination"];
}

function getBounds(coordinates: Coordinate[]): [number, number, number, number] | null {
  const first = coordinates[0];
  if (!first || coordinates.length < 2) {
    return null;
  }

  const bounds = coordinates.reduce(
    (current, item) => ({
      east: Math.max(current.east, item.lng),
      north: Math.max(current.north, item.lat),
      south: Math.min(current.south, item.lat),
      west: Math.min(current.west, item.lng)
    }),
    {
      east: first.lng,
      north: first.lat,
      south: first.lat,
      west: first.lng
    }
  );

  const latPadding = Math.max((bounds.north - bounds.south) * 0.18, 0.001);
  const lngPadding = Math.max((bounds.east - bounds.west) * 0.18, 0.001);

  return [
    bounds.west - lngPadding,
    bounds.south - latPadding,
    bounds.east + lngPadding,
    bounds.north + latPadding
  ];
}

function routeGeoJson(points: Coordinate[]) {
  return {
    type: "FeatureCollection" as const,
    features:
      points.length > 1
        ? [
            {
              type: "Feature" as const,
              properties: {},
              geometry: {
                type: "LineString" as const,
                coordinates: points.map(toLngLat)
              }
            }
          ]
        : []
  };
}

function CurrentLocationPin() {
  return (
    <View style={styles.currentPin}>
      <View style={styles.currentPinCore} />
    </View>
  );
}

function DestinationPin({ color }: { color: string }) {
  return (
    <View style={styles.destinationPin}>
      <View style={[styles.destinationPinHead, { backgroundColor: color }]} />
      <View style={[styles.destinationPinTail, { backgroundColor: color }]} />
    </View>
  );
}

export function MapPanel({ coordinate, markers = [], points = [] }: MapPanelProps) {
  const center = coordinate ?? points[points.length - 1] ?? markers[0]?.coordinate ?? fallbackCoordinate;
  const plottedCoordinates = [
    ...(coordinate ? [coordinate] : []),
    ...markers.map((marker) => marker.coordinate),
    ...points
  ];
  const bounds = getBounds(plottedCoordinates);

  return (
    <View style={styles.container}>
      <Map
        attributionPosition={{ bottom: 8, right: 8 }}
        logo={false}
        mapStyle={mapLibreStyle}
        style={styles.map}
      >
        {bounds ? (
          <Camera bounds={bounds} duration={450} padding={{ bottom: 42, left: 42, right: 42, top: 42 }} />
        ) : (
          <Camera center={toLngLat(center)} duration={450} zoom={15} />
        )}

        {points.length > 1 ? (
          <GeoJSONSource data={routeGeoJson(points)} id="tracked-route-source">
            <Layer
              id="tracked-route-line"
              source="tracked-route-source"
              style={{ lineColor: "#0F766E", lineOpacity: 0.82, lineWidth: 4 }}
              type="line"
            />
          </GeoJSONSource>
        ) : null}

        {coordinate ? (
          <Marker anchor="bottom" id="current-location-pin" lngLat={toLngLat(coordinate)}>
            <CurrentLocationPin />
          </Marker>
        ) : null}

        {markers.map((marker) => (
          <Marker anchor="bottom" id={marker.id} key={marker.id} lngLat={toLngLat(marker.coordinate)}>
            <DestinationPin color={markerColor(marker)} />
          </Marker>
        ))}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    height: 260,
    overflow: "hidden",
    width: "100%"
  },
  map: {
    flex: 1
  },
  currentPin: {
    alignItems: "center",
    backgroundColor: "rgba(14, 165, 233, 0.22)",
    borderColor: "#7DD3FC",
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  currentPinCore: {
    backgroundColor: pinColors.current,
    borderColor: "#FFFFFF",
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    width: 14
  },
  destinationPin: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 28
  },
  destinationPinHead: {
    borderColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 3,
    height: 26,
    width: 26
  },
  destinationPinTail: {
    borderBottomRightRadius: 2,
    height: 11,
    marginTop: -9,
    transform: [{ rotate: "45deg" }],
    width: 11
  }
});

export default MapPanel;
