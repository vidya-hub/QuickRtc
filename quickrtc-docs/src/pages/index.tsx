import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";

const clientExample = `import { QuickRTC } from "quickrtc-client";
import { io } from "socket.io-client";

const socket = io("https://your-server.com");
const rtc = new QuickRTC({ socket });

// Listen for participants
rtc.on("newParticipant", ({ participantName, streams }) => {
  console.log(\`\${participantName} joined with \${streams.length} streams\`);
});

// Join and start sharing
await rtc.join({ conferenceId: "room-1", participantName: "Alice" });
const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
await rtc.produce(media.getTracks());`;

const serverExample = `import { QuickRTCServer } from "quickrtc-server";
import { createServer } from "https";
import { Server } from "socket.io";

const httpsServer = createServer({ key, cert }, app);
const io = new Server(httpsServer, { cors: { origin: "*" } });

const server = new QuickRTCServer({
  httpServer: httpsServer,
  socketServer: io,
});

await server.start();
httpsServer.listen(3000);`;

const reactExample = `import { useQuickRTC, QuickRTCVideo } from "quickrtc-react-client";

function VideoRoom() {
  const { rtc, isConnected, join, produce } = useQuickRTC({ socket });
  const [streams, setStreams] = useState([]);

  useEffect(() => {
    if (!rtc) return;
    rtc.on("newParticipant", ({ streams }) => {
      setStreams(prev => [...prev, ...streams]);
    });
  }, [rtc]);

  return (
    <div>
      {streams.map(s => <QuickRTCVideo key={s.id} stream={s.stream} />)}
    </div>
  );
}`;

function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6">
            QuickRTC
          </h1>
          <p className="text-xl lg:text-2xl opacity-80 mb-4">
            Simple WebRTC conferencing built on mediasoup
          </p>
          <p className="text-lg opacity-60 mb-10 max-w-2xl mx-auto">
            Production-ready video conferencing SDK with automatic stream
            management, event-driven architecture, and React hooks. Build
            real-time video apps in minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link
              to="/docs/getting-started"
              className="button button--primary button--lg px-8 py-3 rounded-lg font-semibold"
            >
              Get Started
            </Link>
            <Link
              to="/docs/client/overview"
              className="button button--secondary button--lg px-8 py-3 rounded-lg font-semibold border-2"
            >
              Documentation
            </Link>
          </div>

          <div className="inline-block bg-neutral-100 dark:bg-neutral-900 rounded-lg px-6 py-3 border border-neutral-200 dark:border-neutral-800">
            <code className="text-sm font-mono">
              npm install quickrtc-react-client quickrtc-server
            </code>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      num: "01",
      title: "Simple API",
      description:
        "Intuitive event-driven API that abstracts away WebRTC complexity. Join conferences, produce media, and handle streams with just a few lines of code.",
    },
    {
      num: "02",
      title: "Auto-Consume",
      description:
        "Remote streams are automatically consumed and ready to use. No manual subscription management required.",
    },
    {
      num: "03",
      title: "React Ready",
      description:
        "First-class React support with hooks and components. useQuickRTC hook handles all the complexity for you.",
    },
    {
      num: "04",
      title: "TypeScript",
      description:
        "Full TypeScript support with comprehensive type definitions. Enjoy autocomplete and type safety throughout.",
    },
    {
      num: "05",
      title: "Scalable",
      description:
        "Built on mediasoup SFU architecture. Efficiently handles multiple participants with minimal bandwidth usage.",
    },
    {
      num: "06",
      title: "Production Ready",
      description:
        "Battle-tested in production environments. Includes error handling, reconnection logic, and comprehensive events.",
    },
  ];

  return (
    <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.num}
              className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
            >
              <span className="text-xs font-mono opacity-40 mb-4 block">
                {feature.num}
              </span>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="opacity-70 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PackagesSection() {
  const packages = [
    {
      name: "quickrtc-client",
      description:
        "Core JavaScript/TypeScript client SDK. Works with any framework or vanilla JS.",
      install: "npm install quickrtc-client",
    },
    {
      name: "quickrtc-server",
      description:
        "Node.js server with mediasoup integration. Handles all WebRTC signaling.",
      install: "npm install quickrtc-server",
    },
    {
      name: "quickrtc-react-client",
      description: "React hooks and components for building video UIs quickly.",
      install: "npm install quickrtc-react-client",
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Packages</h2>
          <p className="text-lg opacity-60 max-w-xl mx-auto">
            QuickRTC is split into modular packages so you can use what you
            need.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono font-semibold">{pkg.name}</span>
                <span className="text-xs px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 opacity-60">
                  npm
                </span>
              </div>
              <p className="opacity-70 mb-4 text-sm leading-relaxed">
                {pkg.description}
              </p>
              <code className="text-xs block bg-neutral-100 dark:bg-neutral-800 rounded px-3 py-2 font-mono">
                {pkg.install}
              </code>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CodeExamplesSection() {
  const examples = [
    {
      title: "Client SDK",
      description:
        "Connect to a conference, share your camera, and receive remote streams with the event-driven API.",
      code: clientExample,
    },
    {
      title: "Server Setup",
      description:
        "Spin up a WebRTC server with automatic room management and media routing.",
      code: serverExample,
    },
    {
      title: "React Integration",
      description:
        "Use the useQuickRTC hook for seamless React integration with automatic state management.",
      code: reactExample,
    },
  ];

  return (
    <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Quick Examples
          </h2>
          <p className="text-lg opacity-60 max-w-xl mx-auto">
            Get up and running in minutes with these examples.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          {examples.map((example, idx) => (
            <div key={idx}>
              <div className="mb-4">
                <h3 className="text-xl font-bold mb-2">{example.title}</h3>
                <p className="opacity-60">{example.description}</p>
              </div>
              <CodeBlock language="typescript">{example.code}</CodeBlock>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to build?</h2>
        <p className="text-lg opacity-60 mb-8">
          Get started with QuickRTC in under 5 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/docs/getting-started"
            className="button button--primary button--lg px-8 py-3 rounded-lg font-semibold"
          >
            Read the Docs
          </Link>
          <Link
            href="https://github.com/vidya-hub/QuickRtc"
            className="button button--secondary button--lg px-8 py-3 rounded-lg font-semibold border-2"
          >
            View on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Simple WebRTC Conferencing"
      description="QuickRTC - Production-ready WebRTC conferencing SDK built on mediasoup. Simple API, React hooks, TypeScript support."
    >
      <main>
        <HeroSection />
        <FeaturesSection />
        <PackagesSection />
        <CodeExamplesSection />
        <CTASection />
      </main>
    </Layout>
  );
}
