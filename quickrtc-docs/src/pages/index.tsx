import type { ReactNode } from "react";
import { useState } from "react";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import Link from "@docusaurus/Link";

/* ===========================================
   Code Examples
   =========================================== */

const codeExamples = {
  server: {
    code: `import { QuickRTCServer } from "quickrtc-server";

const server = new QuickRTCServer({
  httpServer,
  socketServer: io,
});

await server.start();`,
    install: "npm install quickrtc-server",
    lang: "typescript",
  },
  react: {
    code: `import { useQuickRTC } from "quickrtc-react-client";

const { join, produce } = useQuickRTC({ socket });

await join({ conferenceId: "room-1", participantName: "Alice" });
await produce(tracks);`,
    install: "npm install quickrtc-react-client",
    lang: "typescript",
  },
  flutter: {
    code: `final controller = QuickRTCController(socket: socket);

await controller.joinMeeting(
  conferenceId: "room-1",
  participantName: "Alice",
);

await controller.enableMedia();`,
    install: "flutter pub add quickrtc_flutter_client",
    lang: "dart",
  },
};

type TabKey = keyof typeof codeExamples;

/* ===========================================
   Icons
   =========================================== */

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function CubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function DevicePhoneMobileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  );
}

function CodeBracketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

/* ===========================================
   Hero Section
   =========================================== */

function HeroSection() {
  return (
    <section className="hero-section">
      <div className="hero-container">
        {/* Badge */}
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Open Source
        </div>

        {/* Title */}
        <h1 className="hero-title">QuickRTC</h1>

        {/* Subtitle */}
        <p className="hero-subtitle">
          Production-ready WebRTC conferencing SDK
        </p>

        {/* Description */}
        <p className="hero-description">
          Built on mediasoup. Ship video conferencing in days, not weeks.
        </p>

        {/* CTAs */}
        <div className="hero-cta-group">
          <Link to="/docs/getting-started" className="btn btn-primary">
            Get Started
            <ArrowRightIcon className="btn-icon" />
          </Link>
          <Link to="https://github.com/nicholasgriffintn/quickrtc" className="btn btn-secondary">
            <GitHubIcon className="btn-icon-left" />
            GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ===========================================
   Code Section
   =========================================== */

function CodeSection() {
  const [activeTab, setActiveTab] = useState<TabKey>("server");
  const [copied, setCopied] = useState(false);
  const example = codeExamples[activeTab];

  const copyInstall = () => {
    navigator.clipboard.writeText(example.install);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "server", label: "Server" },
    { key: "react", label: "React" },
    { key: "flutter", label: "Flutter" },
  ];

  return (
    <section className="code-section">
      <div className="code-container">
        <div className="code-card">
          {/* Header */}
          <div className="code-card-header">
            <div className="code-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`code-tab ${activeTab === tab.key ? "code-tab--active" : ""}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Code Block */}
          <div className="code-block-wrapper">
            <CodeBlock language={example.lang}>{example.code}</CodeBlock>
          </div>

          {/* Footer */}
          <div className="code-card-footer">
            <div className="install-command">
              <span className="install-prompt">$</span>
              <code>{example.install}</code>
            </div>
            <button onClick={copyInstall} className="copy-btn" aria-label="Copy install command">
              {copied ? (
                <>
                  <CheckIcon className="copy-icon" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="copy-icon" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===========================================
   Features Section
   =========================================== */

const features = [
  {
    title: "Production Ready",
    description: "Battle-tested infrastructure with mediasoup SFU for scalable, low-latency video.",
    icon: CubeIcon,
  },
  {
    title: "Multi-Platform",
    description: "Native SDKs for React and Flutter. Build once, deploy everywhere.",
    icon: DevicePhoneMobileIcon,
  },
  {
    title: "Developer First",
    description: "Clean APIs, TypeScript support, and comprehensive documentation.",
    icon: CodeBracketIcon,
  },
];

function FeaturesSection() {
  return (
    <section className="features-section">
      <div className="features-container">
        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature.title} className="feature-card">
              <div className="feature-icon-wrapper">
                <feature.icon className="feature-icon" />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===========================================
   Links Section
   =========================================== */

const links = [
  {
    title: "Documentation",
    description: "Learn how to get started with QuickRTC",
    href: "/docs/getting-started",
    icon: BookIcon,
  },
  {
    title: "Architecture",
    description: "Understand how QuickRTC works under the hood",
    href: "/docs/concepts/quickrtc-architecture",
    icon: CubeIcon,
  },
  {
    title: "Flutter SDK",
    description: "Build mobile apps with the Flutter client SDK",
    href: "/docs/flutter/getting-started",
    icon: DevicePhoneMobileIcon,
  },
  {
    title: "API Reference",
    description: "Explore the server and client APIs",
    href: "/docs/server/overview",
    icon: CodeBracketIcon,
  },
];

function LinksSection() {
  return (
    <section className="links-section">
      <div className="links-container">
        <h2 className="links-heading">Explore</h2>
        <div className="links-grid">
          {links.map((link) => (
            <Link key={link.title} to={link.href} className="nav-card">
              <div className="nav-card-icon-wrapper">
                <link.icon className="nav-card-icon" />
              </div>
              <div className="nav-card-content">
                <h3 className="nav-card-title">{link.title}</h3>
                <p className="nav-card-description">{link.description}</p>
              </div>
              <ArrowRightIcon className="nav-card-arrow" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===========================================
   Page
   =========================================== */

export default function Home(): ReactNode {
  return (
    <Layout
      title="Production-ready WebRTC SDK"
      description="QuickRTC - Production-ready WebRTC conferencing SDK built on mediasoup. Ship video conferencing in days, not weeks."
    >
      <main className="homepage">
        <HeroSection />
        <CodeSection />
        <FeaturesSection />
        <LinksSection />
      </main>
    </Layout>
  );
}
