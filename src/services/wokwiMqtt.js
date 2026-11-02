
import mqtt from "mqtt";

const MQTT_URL = "wss://broker.hivemq.com:8884/mqtt";

export function connectWokwiMqtt(farmId, onStatus, onReading) {
  if (!farmId) {
    onStatus("no-device");
    return () => {};
  }

  const topic = `drisa/farms/${farmId}/telemetry`;

  onStatus("connecting");

  const client = mqtt.connect(MQTT_URL, {
    reconnectPeriod: 3000,
    connectTimeout: 15000,
    clean: true,
  });

  client.on("connect", () => {
    client.subscribe(topic, (error) => {
      if (error) {
        console.error("MQTT subscription failed:", error);
        onStatus("error");
        return;
      }

      onStatus("connected");
    });
  });

  client.on("message", (receivedTopic, message) => {
    if (receivedTopic !== topic) return;

    try {
      const reading = JSON.parse(message.toString());

      // Reject messages assigned to another farm.
      if (reading.farmId !== farmId) return;

      onReading({
        ...reading,
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Invalid sensor message:", error);
    }
  });

  client.on("error", (error) => {
    console.error("MQTT connection error:", error);
    onStatus("error");
  });

  client.on("reconnect", () => onStatus("connecting"));
  client.on("close", () => onStatus("disconnected"));

  return () => {
    client.end(true);
  };
}
