import FlowVisualization from '../components/FlowVisualization';
import { quickrtcEvents, categoryColors } from '../data/quickrtcEvents';

export default function QuickRTCFlow() {
  return (
    <FlowVisualization
      events={quickrtcEvents}
      categoryColors={categoryColors}
      title="QuickRTC Flow"
      subtitle="Conference implementation events"
      accentColor="purple"
    />
  );
}
