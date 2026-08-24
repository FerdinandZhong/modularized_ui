'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Zap, Workflow, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Section } from '@/components/ui/Section';
import { GlassNav } from '@/components/ui/GlassNav';
import { ConnectForm } from '@/components/connect/ConnectForm';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black">
      <GlassNav>
        <div className="flex w-full items-center justify-between">
          <span className="text-micro font-medium tracking-wider uppercase text-white/80">
            Agent Workflow
          </span>
          <div className="flex items-center gap-5">
            <button
              onClick={() => router.push('/analytics')}
              className="text-micro text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              Analytics
            </button>
            <button
              onClick={() => router.push('/workflow')}
              className="text-micro text-apple-bright-blue hover:text-white transition-colors cursor-pointer"
            >
              Try Demo
            </button>
          </div>
        </div>
      </GlassNav>

      {/* Hero */}
      <Section variant="dark" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,113,227,0.08)_0%,transparent_70%)]" />
        <div className="relative text-center py-32 md:py-44">
          <p className="text-micro font-medium tracking-widest uppercase text-apple-bright-blue mb-5 animate-fade-in-up">
            Dynamic Workflow Interface
          </p>
          <h1 className="text-display-hero text-white text-balance animate-fade-in-up-delay-1">
            Agent Workflow
          </h1>
          <p className="text-sub-heading text-white/50 mt-5 max-w-xl mx-auto text-balance animate-fade-in-up-delay-2">
            Connect to any CAI Agent Studio workflow. Discover inputs at runtime. Interact dynamically.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10 animate-fade-in-up-delay-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => document.getElementById('connect')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Get Started
              <ArrowRight size={16} className="ml-2" />
            </Button>
            <Button
              variant="pill-dark"
              size="lg"
              onClick={() => router.push('/workflow')}
            >
              Try Demo
            </Button>
          </div>
        </div>
      </Section>

      {/* Features */}
      <Section variant="dark" className="border-t border-white/[0.04]">
        <div className="py-24">
          <div className="grid md:grid-cols-3 gap-5">
            <Card variant="glass">
              <div className="h-10 w-10 rounded-large bg-apple-blue/10 flex items-center justify-center mb-5">
                <Zap size={20} className="text-apple-blue" />
              </div>
              <h3 className="text-body-emphasis text-white mb-2">Runtime Discovery</h3>
              <p className="text-caption text-white/40 leading-relaxed">
                Input schemas are discovered at runtime from the workflow API. No custom UI needed per workflow.
              </p>
            </Card>
            <Card variant="glass">
              <div className="h-10 w-10 rounded-large bg-apple-blue/10 flex items-center justify-center mb-5">
                <Workflow size={20} className="text-apple-blue" />
              </div>
              <h3 className="text-body-emphasis text-white mb-2">Live Execution</h3>
              <p className="text-caption text-white/40 leading-relaxed">
                Watch agent execution in real-time. Event timeline shows every step, tool call, and LLM interaction.
              </p>
            </Card>
            <Card variant="glass">
              <div className="h-10 w-10 rounded-large bg-apple-blue/10 flex items-center justify-center mb-5">
                <Shield size={20} className="text-apple-blue" />
              </div>
              <h3 className="text-body-emphasis text-white mb-2">Conversational Mode</h3>
              <p className="text-caption text-white/40 leading-relaxed">
                Chat-based workflows get a dedicated conversation interface with multi-turn context.
              </p>
            </Card>
          </div>
        </div>
      </Section>

      {/* Connect */}
      <Section variant="dark" className="border-t border-white/[0.04]" id="connect">
        <div className="py-28 flex flex-col items-center">
          <p className="text-micro font-medium tracking-widest uppercase text-apple-bright-blue mb-4">
            Connect
          </p>
          <h2 className="text-section-heading text-white text-center mb-3">
            Enter your workflow details
          </h2>
          <p className="text-caption text-white/40 text-center mb-12 max-w-md">
            Provide the URL and API key for your CAI Agent Studio workflow to get started.
          </p>
          <ConnectForm />
        </div>
      </Section>
    </div>
  );
}
