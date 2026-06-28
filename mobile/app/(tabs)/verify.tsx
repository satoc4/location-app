import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { geoactionClient } from "../../src/api/geoactionClient";
import { ActionButton } from "../../src/components/ActionButton";
import { Card } from "../../src/components/Card";
import { Screen } from "../../src/components/Screen";
import { StatusPill } from "../../src/components/StatusPill";
import { localizeStatus } from "../../src/i18n/domainText";
import { useI18n } from "../../src/i18n/useI18n";
import { useSessionStore } from "../../src/store/sessionStore";
import { colors, spacing } from "../../src/styles/theme";

export default function VerifyScreen() {
  const { locale, t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { activeActionRun, setActiveActionRun } = useSessionStore();

  const sendQrCode = async (qrCode: string) => {
    if (!activeActionRun) {
      Alert.alert(t("verify.noActiveActionTitle"), t("verify.noActiveActionBody"));
      return;
    }

    setSending(true);
    try {
      const result = await geoactionClient.sendActionEvent(activeActionRun.id, {
        type: "qr_scan",
        qrCode,
        recordedAt: new Date().toISOString()
      });
      setActiveActionRun(result.actionRun);
      setScannedValue(qrCode);
    } catch (error) {
      Alert.alert(
        t("verify.qrFailed"),
        error instanceof Error ? error.message : t("common.unknownError")
      );
    } finally {
      setSending(false);
    }
  };

  if (!permission?.granted) {
    return (
      <Screen title={t("verify.title")} subtitle={t("verify.subtitle")}>
        <Card style={styles.emptyPanel}>
          <StatusPill label={t("verify.cameraPermission")} tone="warning" />
          <Text style={styles.emptyTitle}>{t("verify.cameraAccessRequired")}</Text>
          <ActionButton icon="camera" label={t("verify.allowCamera")} onPress={requestPermission} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title={t("verify.title")} subtitle={t("verify.subtitle")}>
      <Card padding="none" style={styles.cameraShell}>
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => {
            if (data && data !== scannedValue) {
              sendQrCode(data);
            }
          }}
          style={styles.camera}
        />
      </Card>

      <Card style={styles.panel}>
        <View style={styles.row}>
          {activeActionRun ? (
            <StatusPill label={localizeStatus(locale, activeActionRun.status)} tone="blue" />
          ) : (
            <StatusPill label={t("track.noAction")} tone="warning" />
          )}
          {sending ? <StatusPill label={t("verify.sending")} tone="neutral" /> : null}
        </View>
        <Text style={styles.value}>{scannedValue ?? t("verify.noQrScanned")}</Text>
        <ActionButton
          icon="refresh-ccw"
          label={t("verify.reset")}
          onPress={() => setScannedValue(null)}
          variant="secondary"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraShell: {
    height: 360,
    overflow: "hidden"
  },
  camera: {
    flex: 1
  },
  panel: {
    gap: spacing.md
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  value: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  emptyPanel: {
    gap: spacing.md
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  }
});
