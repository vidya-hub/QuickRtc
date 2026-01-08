import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";

import { Button } from "../components/Button";
import { FeatureCard } from "../components/FeatureCard";
import { PackageCard } from "../components/PackageCard";
import { InstallCommand } from "../components/InstallCommand";
import { SectionHeading } from "../components/SectionHeading";
import { AnimatedBackground, GridPattern } from "../components/AnimatedBackground";
import {
  IconCode,
  IconZap,
  IconReact,
  IconTypeScript,
  IconScale,
  IconShield,
  IconVideo,
  IconGithub,
} from "../components/Icons";

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
    <div className="grid grid-cols-2 gap-4">
      {streams.map(s => <QuickRTCVideo key={s.id} stream={s.stream} />)}
    </div>
  );
}`;

const features = [
  {
    icon: <IconCode className="w-full h-full" />,
    title: "Simple API",
    description:
      "Intuitive event-driven API that abstracts away WebRTC complexity. Join conferences, produce media, and handle streams with just a few lines of code.",
  },
  {
    icon: <IconZap className="w-full h-full" />,
    title: "Auto-Consume",
    description:
      "Remote streams are automatically consumed and ready to use. No manual subscription management required.",
  },
  {
    icon: <IconReact className="w-full h-full" />,
    title: "React Ready",
    description:
      "First-class React support with hooks and components. useQuickRTC hook handles all the complexity for you.",
  },
  {
    icon: <IconTypeScript className="w-full h-full" />,
    title: "TypeScript First",
    description:
      "Full TypeScript support with comprehensive type definitions. Enjoy autocomplete and type safety throughout.",
  },
  {
    icon: <IconScale className="w-full h-full" />,
    title: "Scalable",
    description:
      "Built on mediasoup SFU architecture. Efficiently handles multiple participants with minimal bandwidth usage.",
  },
  {
    icon: <IconShield className="w-full h-full" />,
    title: "Production Ready",
    description:
      "Battle-tested in production environments. Includes error handling, reconnection logic, and comprehensive events.",
  },
];

const packages = [
  {
    name: "quickrtc-client",
    description:
      "Core JavaScript/TypeScript client SDK. Works with any framework or vanilla JS.",
    install: "npm install quickrtc-client",
    type: "client" as const,
  },
  {
    name: "quickrtc-server",
    description:
      "Node.js server with mediasoup integration. Handles all WebRTC signaling.",
    install: "npm install quickrtc-server",
    type: "server" as const,
  },
  {
    name: "quickrtc-react-client",
    description:
      "React hooks and components for building video UIs quickly.",
    install: "npm install quickrtc-react-client",
    type: "react" as const,
  },
];

const codeExamples = [
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

function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <AnimatedBackground />
      <GridPattern />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 mb-8 animate-fade-in">
            <IconVideo className="w-4 h-4 text-neutral-500" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              WebRTC made simple
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in-up">
            <span className="text-neutral-900 dark:text-white">Quick</span>
            <span className="text-neutral-400 dark:text-neutral-500">RTC</span>
          </h1>

          {/* Tagline */}
          <p className="text-xl lg:text-2xl text-neutral-600 dark:text-neutral-400 mb-4 animate-fade-in-up animation-delay-100">
            Simple WebRTC conferencing built on mediasoup
          </p>

          {/* Description */}
          <p className="text-base lg:text-lg text-neutral-500 dark:text-neutral-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            Production-ready video conferencing SDK with automatic stream
            management, event-driven architecture, and React hooks. 
            Build real-time video apps in minutes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-up animation-delay-300">
            <Button to="/docs/getting-started" variant="primary" size="lg" icon>
              Get Started
            </Button>
            <Button href="https://github.com/vidya-hub/QuickRtc" variant="secondary" size="lg">
              <IconGithub className="w-5 h-5" />
              View on GitHub
            </Button>
          </div>

          {/* Install Command */}
          <div className="animate-fade-in-up animation-delay-400">
            <InstallCommand command="npm install quickrtc-react-client quickrtc-server" />
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-neutral-950 to-transparent pointer-events-none" />
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <SectionHeading
          badge="Features"
          title="Everything you need for video conferencing"
          description="QuickRTC provides a complete toolkit for building real-time video applications with minimal effort."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, idx) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={idx}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PackagesSection() {
  return (
    <section className="py-24 bg-neutral-50 dark:bg-neutral-900/30 relative">
      <GridPattern />
      <div className="container mx-auto px-4 relative z-10">
        <SectionHeading
          badge="Packages"
          title="Modular by design"
          description="QuickRTC is split into focused packages so you can use exactly what you need."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.name}
              name={pkg.name}
              description={pkg.description}
              install={pkg.install}
              type={pkg.type}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CodeExamplesSection() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <SectionHeading
          badge="Examples"
          title="Quick to implement"
          description="Get up and running in minutes with these examples."
        />

        <div className="max-w-4xl mx-auto space-y-16">
          {codeExamples.map((example, idx) => (
            <div
              key={example.title}
              className={`grid lg:grid-cols-2 gap-8 items-start ${
                idx % 2 === 1 ? "lg:direction-rtl" : ""
              }`}
            >
              <div className={`space-y-4 ${idx % 2 === 1 ? "lg:order-2" : ""}`}>
                <span className="inline-block text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {example.title}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {example.description}
                </p>
              </div>
              <div className={`${idx % 2 === 1 ? "lg:order-1" : ""}`}>
                <div className="code-block-wrapper rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-lg">
                  <CodeBlock language="typescript">{example.code}</CodeBlock>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-900 dark:to-neutral-950" />
      <GridPattern />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-5xl font-bold text-neutral-900 dark:text-white mb-6">
            Ready to build?
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-10 max-w-xl mx-auto">
            Start building your real-time video application in under 5 minutes with QuickRTC.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button to="/docs/getting-started" variant="primary" size="lg" icon>
              Read the Docs
            </Button>
            <Button href="https://github.com/vidya-hub/QuickRtc" variant="secondary" size="lg">
              <IconGithub className="w-5 h-5" />
              Star on GitHub
            </Button>
          </div>
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
      <main className="overflow-hidden">
        <HeroSection />
        <FeaturesSection />
        <PackagesSection />
        <CodeExamplesSection />
        <CTASection />
      </main>
    </Layout>
  );
}
