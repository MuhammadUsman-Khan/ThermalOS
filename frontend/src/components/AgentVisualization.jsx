import { useEffect, useRef } from "react";
import Phaser from "phaser";
import {
  Building2,
  Activity,
  Cpu,
  RefreshCw,
  Zap,
  AlertOctagon,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

export default function AgentVisualization({
  agentStates = {},
  darkMode = true,
  onRunAudit,
  onRunInfra,
  onRunCivic,
  isAuditLoading,
  isInfraLoading,
  isCivicLoading,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth || 980;
    const containerHeight = 360;

    class CyberneticCommandScene extends Phaser.Scene {
      constructor() {
        super({ key: "CyberneticCommandScene" });
        this.agents = {};
        this.pods = {};
        this.workstations = {};
        this.currentDarkMode = darkMode;
        this.particles = [];
        this.dataPackets = [];
        this.scanBeams = [];
      }

      create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.skyG = this.add.graphics();
        this.cityG = this.add.graphics();
        this.roomG = this.add.graphics();
        this.floorG = this.add.graphics();
        this.lightingG = this.add.graphics();
        this.fxG = this.add.graphics();
        this.particlesG = this.add.graphics();

        this.renderEnvironment(this.currentDarkMode);

        const agentConfigs = [
          {
            id: "agent1",
            name: "AGENT 1 · THERMAL ANALYST",
            role: "ASHRAE 55 & IECC RAG CORE",
            podCode: "VAULT 101",
            podName: "RAG VECTOR VAULT",
            themeColor: 0xf59e0b, // Amber
            themeHex: "#F59E0B",
            outfitColor: 0xf59e0b,
            hairColor: 0x18181b,
            skinColor: 0xfde68a,
            deskX: width * 0.22,
            deskY: 255,
            podX: width * 0.22,
            podY: 100,
          },
          {
            id: "agent2",
            name: "AGENT 2 · PRE-COOL CONTROLLER",
            role: "HVAC CHILLER PEAK SHIFT",
            podCode: "CORE 102",
            podName: "CHILLER PLANT CORE",
            themeColor: 0x06b6d4, // Electric Cyan
            themeHex: "#06B6D4",
            outfitColor: 0x06b6d4,
            hairColor: 0x0f172a,
            skinColor: 0xfed7aa,
            deskX: width * 0.50,
            deskY: 255,
            podX: width * 0.50,
            podY: 100,
          },
          {
            id: "agent3",
            name: "AGENT 3 · CIVIC DISPATCHER",
            role: "LILJEGREN WBGT CIVIC OVERRIDE",
            podCode: "HUB 103",
            podName: "CIVIC DISPATCH HUB",
            themeColor: 0xf43f5e, // Radiant Rose
            themeHex: "#F43F5E",
            outfitColor: 0xf43f5e,
            hairColor: 0x3b0764,
            skinColor: 0xfecdd3,
            deskX: width * 0.78,
            deskY: 255,
            podX: width * 0.78,
            podY: 100,
          },
        ];

        agentConfigs.forEach((cfg) => {
          // --- 1. Holographic Quantum Server Pod (Back Wall) ---
          const podContainer = this.add.container(cfg.podX, cfg.podY);
          const podChassisG = this.add.graphics();
          const podGlowG = this.add.graphics();
          const podBladesG = this.add.graphics();

          const podLabel = this.add.text(0, -50, `[ ${cfg.podCode} • ${cfg.podName} ]`, {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "9px",
            color: cfg.themeHex,
            backgroundColor: this.currentDarkMode ? "#0B0F19" : "#FFFFFF",
            padding: { x: 8, y: 3.5 },
            fontStyle: "bold",
            align: "center",
          }).setOrigin(0.5, 0.5);

          podContainer.add([podChassisG, podGlowG, podBladesG, podLabel]);
          this.pods[cfg.id] = {
            container: podContainer,
            chassisG: podChassisG,
            glowG: podGlowG,
            bladesG: podBladesG,
            label: podLabel,
            cfg,
          };

          // --- 2. Curved Glass Workstation (Floor Layer) ---
          const wsContainer = this.add.container(cfg.deskX, cfg.deskY);
          const rugG = this.add.graphics();
          const chairG = this.add.graphics();
          const deskG = this.add.graphics();
          const holoMonitorG = this.add.graphics();
          const terminalStreamsG = this.add.graphics();

          // Title Plate Below Desk
          const namePlate = this.add.text(0, 58, cfg.name, {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "11px",
            color: cfg.themeHex,
            fontStyle: "bold",
            align: "center",
          }).setOrigin(0.5, 0.5);

          const rolePlate = this.add.text(0, 72, cfg.role, {
            fontFamily: "Inter, sans-serif",
            fontSize: "9px",
            color: this.currentDarkMode ? "#94A3B8" : "#64748B",
            fontWeight: "600",
            align: "center",
          }).setOrigin(0.5, 0.5);

          // Real-time floating status badge
          const statusBadge = this.add.text(0, -68, "STANDBY · READY", {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "8.5px",
            color: "#FFFFFF",
            backgroundColor: "#1E293B",
            padding: { x: 7, y: 3 },
            align: "center",
          }).setOrigin(0.5, 0.5);

          wsContainer.add([rugG, chairG, deskG, holoMonitorG, terminalStreamsG, namePlate, rolePlate, statusBadge]);
          this.workstations[cfg.id] = {
            container: wsContainer,
            rugG,
            chairG,
            deskG,
            holoMonitorG,
            terminalStreamsG,
            namePlate,
            rolePlate,
            statusBadge,
            cfg,
          };

          // --- 3. Executive Avatar Character ---
          const agentContainer = this.add.container(cfg.deskX, cfg.deskY);
          const shadowG = this.add.graphics();
          const avatarG = this.add.graphics();
          const holoRingG = this.add.graphics();

          agentContainer.add([shadowG, avatarG, holoRingG]);
          this.agents[cfg.id] = {
            container: agentContainer,
            shadowG,
            avatarG,
            holoRingG,
            cfg,
            state: "idle",
            typingTime: 0,
          };

          this.drawPod(cfg.id, "idle");
          this.drawWorkstation(cfg.id);
          this.drawAvatar(cfg.id, "idle");
        });

        // Floating cybernetic dust motes
        for (let i = 0; i < 28; i++) {
          this.particles.push({
            x: Phaser.Math.Between(0, width),
            y: Phaser.Math.Between(0, height),
            speedX: Phaser.Math.FloatBetween(-0.2, 0.2),
            speedY: Phaser.Math.FloatBetween(-0.4, -0.1),
            size: Phaser.Math.FloatBetween(1, 2.5),
            alpha: Phaser.Math.FloatBetween(0.2, 0.6),
            color: i % 3 === 0 ? 0xf59e0b : i % 3 === 1 ? 0x06b6d4 : 0x38bdf8,
          });
        }

        sceneRef.current = this;
      }

      update(time, delta) {
        this.particlesG.clear();
        this.fxG.clear();

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Animate Atmospheric Cyber Motes
        this.particles.forEach((p) => {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.y < 0) {
            p.y = height;
            p.x = Phaser.Math.Between(0, width);
          }
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;

          this.particlesG.fillStyle(p.color, p.alpha * (this.currentDarkMode ? 0.6 : 0.35));
          this.particlesG.fillCircle(p.x, p.y, p.size);
        });

        // 2. Animate Server Pod LEDs & Holographic Code Streams
        Object.keys(this.agents).forEach((id) => {
          const agent = this.agents[id];
          const ws = this.workstations[id];
          const pod = this.pods[id];
          if (!agent || !ws || !pod) return;

          if (agent.state === "working") {
            // Typing glow oscillation
            const glowSin = (Math.sin(time * 0.008) + 1) * 0.5;
            agent.holoRingG.clear();
            agent.holoRingG.lineStyle(1.5, agent.cfg.themeColor, 0.4 + glowSin * 0.5);
            agent.holoRingG.strokeEllipse(0, 18, 54 + glowSin * 8, 22 + glowSin * 4);

            // Flowing data packets between server pod and terminal
            const packetY = 110 + ((time * 0.12) % 130);
            this.fxG.fillStyle(agent.cfg.themeColor, 0.85);
            this.fxG.fillCircle(agent.cfg.deskX, packetY, 2.5);
            this.fxG.lineStyle(1, agent.cfg.themeColor, 0.35);
            this.fxG.lineBetween(agent.cfg.deskX, 110, agent.cfg.deskX, 240);
          }
        });
      }

      renderEnvironment(isDark) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const horizonY = 160;

        this.skyG.clear();
        this.cityG.clear();
        this.roomG.clear();
        this.floorG.clear();
        this.lightingG.clear();

        if (isDark) {
          // Midnight Atmospheric Command Sky
          this.skyG.fillStyle(0x07090e, 1);
          this.skyG.fillRect(0, 0, width, horizonY);

          // Deep Horizon Atmospheric Fog Gradient
          this.skyG.fillStyle(0x0f172a, 0.8);
          this.skyG.fillRect(0, horizonY - 40, width, 40);

          // Distant Realistic Silhouetted Skyline
          const towers = [
            { x: 40, w: 55, h: 95 },
            { x: 110, w: 75, h: 135 },
            { x: 200, w: 48, h: 80 },
            { x: 290, w: 85, h: 125 },
            { x: 410, w: 60, h: 100 },
            { x: 580, w: 90, h: 140 },
            { x: 690, w: 65, h: 105 },
            { x: 800, w: 80, h: 130 },
            { x: 910, w: 50, h: 90 },
          ];

          towers.forEach((t) => {
            this.cityG.fillStyle(0x131b2e, 1);
            this.cityG.fillRect(t.x, horizonY - t.h, t.w, t.h);

            // Elegant high-rise illuminated windows
            for (let wy = horizonY - t.h + 8; wy < horizonY - 8; wy += 10) {
              for (let wx = t.x + 6; wx < t.x + t.w - 6; wx += 8) {
                if (Math.sin(wx * 2.3 + wy * 1.7) > 0.1) {
                  const isGold = Math.sin(wx * wy) > 0.4;
                  this.cityG.fillStyle(isGold ? 0xfde047 : 0x38bdf8, 0.65);
                  this.cityG.fillRect(wx, wy, 3.5, 5);
                }
              }
            }

            // High-rise rooftop obstacle beacon lights
            this.cityG.fillStyle(0xf43f5e, 0.9);
            this.cityG.fillCircle(t.x + t.w / 2, horizonY - t.h - 2, 2);
          });

          // Architectural Dark Window Mullions & Lintels
          this.roomG.fillStyle(0x0c101c, 1);
          this.roomG.fillRect(0, 0, width * 0.10, horizonY);
          this.roomG.fillRect(width * 0.35, 0, 18, horizonY);
          this.roomG.fillRect(width * 0.63, 0, 18, horizonY);
          this.roomG.fillRect(width * 0.90, 0, width * 0.10, horizonY);

          // Top Header Ceiling Pelmet
          this.roomG.fillStyle(0x1e293b, 1);
          this.roomG.fillRect(0, 0, width, 16);
          this.roomG.lineStyle(1.5, 0x38bdf8, 0.4);
          this.roomG.lineBetween(0, 16, width, 16);

          // Horizon Ground Datum Laser Strip
          this.lightingG.lineStyle(2, 0x38bdf8, 0.7);
          this.lightingG.lineBetween(0, horizonY, width, horizonY);

          // Glossy Obsidian Floor with Reflective Matrix Grid
          this.floorG.fillStyle(0x090c15, 1);
          this.floorG.fillRect(0, horizonY, width, height - horizonY);

          this.floorG.lineStyle(1, 0x1e293b, 0.55);
          for (let y = horizonY + 16; y <= height; y += 22) {
            this.floorG.lineBetween(0, y, width, y);
          }
          for (let x = 0; x <= width; x += 55) {
            this.floorG.lineBetween(x, horizonY, x, height);
          }

          // Volumetric Downlight Cones from Ceiling
          const bays = [width * 0.22, width * 0.50, width * 0.78];
          bays.forEach((bx) => {
            this.lightingG.fillStyle(0xffffff, 0.04);
            this.lightingG.beginPath();
            this.lightingG.moveTo(bx, 16);
            this.lightingG.lineTo(bx - 80, horizonY + 70);
            this.lightingG.lineTo(bx + 80, horizonY + 70);
            this.lightingG.closePath();
            this.lightingG.fillPath();
          });
        } else {
          // Daylight Scandinavian High-Tech Sky
          this.skyG.fillStyle(0xe2e8f0, 1);
          this.skyG.fillRect(0, 0, width, horizonY);

          this.cityG.fillStyle(0x94a3b8, 0.6);
          const towers = [
            { x: 40, w: 55, h: 95 },
            { x: 110, w: 75, h: 135 },
            { x: 200, w: 48, h: 80 },
            { x: 290, w: 85, h: 125 },
            { x: 410, w: 60, h: 100 },
            { x: 580, w: 90, h: 140 },
            { x: 690, w: 65, h: 105 },
            { x: 800, w: 80, h: 130 },
            { x: 910, w: 50, h: 90 },
          ];
          towers.forEach((t) => {
            this.cityG.fillRect(t.x, horizonY - t.h, t.w, t.h);
          });

          this.roomG.fillStyle(0xcbd5e1, 1);
          this.roomG.fillRect(0, 0, width * 0.10, horizonY);
          this.roomG.fillRect(width * 0.35, 0, 18, horizonY);
          this.roomG.fillRect(width * 0.63, 0, 18, horizonY);
          this.roomG.fillRect(width * 0.90, 0, width * 0.10, horizonY);

          this.floorG.fillStyle(0xf8fafc, 1);
          this.floorG.fillRect(0, horizonY, width, height - horizonY);

          this.floorG.lineStyle(1, 0xe2e8f0, 0.9);
          for (let y = horizonY + 16; y <= height; y += 22) {
            this.floorG.lineBetween(0, y, width, y);
          }
          for (let x = 0; x <= width; x += 55) {
            this.floorG.lineBetween(x, horizonY, x, height);
          }
        }
      }

      drawPod(agentId, state = "idle") {
        const pod = this.pods[agentId];
        if (!pod) return;

        const { chassisG, glowG, bladesG, cfg } = pod;
        chassisG.clear();
        glowG.clear();
        bladesG.clear();

        const pw = 68;
        const ph = 76;
        const mainColor = state === "alert" ? 0xf43f5e : cfg.themeColor;

        // Server Pod Outer Titanium Enclosure
        chassisG.fillStyle(this.currentDarkMode ? 0x0b1120 : 0x1e293b, 1);
        chassisG.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 6);
        chassisG.lineStyle(1.8, mainColor, 0.9);
        chassisG.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 6);

        // Internal Server Blade Bays
        chassisG.fillStyle(0x030712, 0.95);
        chassisG.fillRoundedRect(-pw / 2 + 5, -ph / 2 + 5, pw - 10, ph - 10, 4);

        // Horizontal Blade Slots with LED status indicators
        for (let i = 0; i < 4; i++) {
          const by = -ph / 2 + 10 + i * 14;
          bladesG.fillStyle(0x1e293b, 1);
          bladesG.fillRoundedRect(-pw / 2 + 8, by, pw - 16, 10, 2);

          // Blinking Activity LEDs
          const ledColor = state === "working" ? 0x10b981 : state === "alert" ? 0xf43f5e : mainColor;
          bladesG.fillStyle(ledColor, 0.9);
          bladesG.fillCircle(-pw / 2 + 15, by + 5, 1.8);
          bladesG.fillStyle(0x38bdf8, 0.85);
          bladesG.fillCircle(-pw / 2 + 22, by + 5, 1.8);
          bladesG.fillStyle(mainColor, 0.85);
          bladesG.fillCircle(-pw / 2 + 29, by + 5, 1.8);
        }

        // Active State Radiant Holographic Glow
        if (state === "working" || state === "alert") {
          glowG.fillStyle(mainColor, 0.15);
          glowG.fillRoundedRect(-pw / 2 - 8, -ph / 2 - 8, pw + 16, ph + 16, 10);
        }
      }

      drawWorkstation(agentId) {
        const ws = this.workstations[agentId];
        if (!ws) return;

        const { rugG, chairG, deskG, holoMonitorG, cfg } = ws;
        rugG.clear();
        chairG.clear();
        deskG.clear();
        holoMonitorG.clear();

        // 1. High-Tech Hexagonal Floor Pedestal
        rugG.fillStyle(this.currentDarkMode ? 0x111827 : 0xe2e8f0, 0.7);
        rugG.fillRoundedRect(-60, -28, 120, 68, 12);
        rugG.lineStyle(1.5, cfg.themeColor, 0.5);
        rugG.strokeRoundedRect(-60, -28, 120, 68, 12);

        // 2. Ergonomic Carbon Mesh Chair (Back layer)
        chairG.fillStyle(0x030712, 1);
        chairG.fillRect(-14, 16, 28, 4);
        chairG.fillCircle(-14, 20, 2);
        chairG.fillCircle(14, 20, 2);
        chairG.fillStyle(0x475569, 1);
        chairG.fillRoundedRect(-16, -32, 32, 30, 4);
        chairG.fillStyle(0x0f172a, 1);
        chairG.fillRect(-12, -14, 24, 6);

        // 3. Curved Frosted Glass Floating Desk
        deskG.fillStyle(this.currentDarkMode ? 0x1e293b : 0xffffff, 0.95);
        deskG.fillRoundedRect(-48, -12, 96, 28, 6);
        deskG.lineStyle(1.5, cfg.themeColor, 0.85);
        deskG.strokeRoundedRect(-48, -12, 96, 28, 6);

        // Brushed Titanium Legs
        deskG.fillStyle(0x64748b, 1);
        deskG.fillRect(-44, 16, 4, 14);
        deskG.fillRect(40, 16, 4, 14);

        // Large Dark Mat
        deskG.fillStyle(0x030712, 0.9);
        deskG.fillRoundedRect(-36, -8, 72, 20, 3);

        // 4. Curved Holographic Dual-Display Array
        holoMonitorG.fillStyle(0x030712, 1);
        holoMonitorG.fillRoundedRect(-34, -36, 36, 22, 3);
        holoMonitorG.lineStyle(1.2, cfg.themeColor, 1);
        holoMonitorG.strokeRoundedRect(-34, -36, 36, 22, 3);

        // Display telemetry waveforms
        holoMonitorG.fillStyle(cfg.themeColor, 0.95);
        holoMonitorG.fillRect(-30, -32, 28, 2.5);
        holoMonitorG.fillRect(-30, -27, 20, 2.5);
        holoMonitorG.fillRect(-30, -22, 25, 2.5);

        // Right Secondary Terminal
        holoMonitorG.fillStyle(0x030712, 1);
        holoMonitorG.fillRoundedRect(6, -26, 24, 16, 2);
        holoMonitorG.lineStyle(1, 0x38bdf8, 0.9);
        holoMonitorG.strokeRoundedRect(6, -26, 24, 16, 2);
        holoMonitorG.fillStyle(0x38bdf8, 0.85);
        holoMonitorG.fillRect(9, -23, 18, 2);
        holoMonitorG.fillRect(9, -19, 12, 2);
      }

      drawAvatar(agentId, state = "idle") {
        const agent = this.agents[agentId];
        if (!agent) return;

        const { shadowG, avatarG, cfg } = agent;
        shadowG.clear();
        avatarG.clear();

        const cy = 0;
        const skin = cfg.skinColor;
        const suit = cfg.outfitColor;
        const hair = cfg.hairColor;

        // Ambient Shadow
        shadowG.fillStyle(0x000000, 0.4);
        shadowG.fillEllipse(0, cy + 22, 28, 8);

        // Legs & Trousers
        avatarG.fillStyle(0x0f172a, 1);
        avatarG.fillRect(-8, cy + 2, 6, 16);
        avatarG.fillRect(2, cy + 2, 6, 16);
        avatarG.fillStyle(0x000000, 1);
        avatarG.fillRoundedRect(-9, cy + 16, 8, 4, 1);
        avatarG.fillRoundedRect(1, cy + 16, 8, 4, 1);

        // Executive Jacket & Collar
        avatarG.fillStyle(suit, 1);
        avatarG.fillRoundedRect(-11, cy - 18, 22, 22, 3);
        avatarG.lineStyle(1.2, 0xffffff, 0.8);
        avatarG.lineBetween(0, cy - 16, 0, cy + 4);

        // Head & Hair
        avatarG.fillStyle(skin, 1);
        avatarG.fillCircle(0, cy - 26, 9);
        avatarG.fillStyle(hair, 1);
        avatarG.fillCircle(0, cy - 30, 9.5);
        avatarG.fillRect(-9, cy - 32, 18, 6);

        // Neural Headset Visor
        avatarG.fillStyle(cfg.themeColor, 1);
        avatarG.fillRoundedRect(-7, cy - 27, 14, 4, 1);

        // Arms in Typing Position
        avatarG.lineStyle(3, suit, 1);
        avatarG.lineBetween(-9, cy - 12, -4, cy + 1);
        avatarG.lineBetween(-4, cy + 1, -1, cy + 3);
        avatarG.fillStyle(skin, 1);
        avatarG.fillCircle(-1, cy + 3, 2);

        avatarG.lineStyle(3, suit, 1);
        avatarG.lineBetween(9, cy - 12, 4, cy + 1);
        avatarG.lineBetween(4, cy + 1, 1, cy + 3);
        avatarG.fillStyle(skin, 1);
        avatarG.fillCircle(1, cy + 3, 2);
      }

      applyAgentState(agentId, state) {
        const agent = this.agents[agentId];
        const ws = this.workstations[agentId];
        const pod = this.pods[agentId];
        if (!agent || !ws || !pod) return;

        agent.state = state;
        this.drawPod(agentId, state);

        if (state === "working") {
          ws.statusBadge.setText("⚡ EXECUTING · RAG SYNC");
          ws.statusBadge.setBackgroundColor("#D97706");

          this.tweens.killTweensOf(agent.container);
          this.tweens.add({
            targets: agent.container,
            y: agent.cfg.deskY - 2.5,
            yoyo: true,
            repeat: -1,
            duration: 280,
            ease: "Sine.easeInOut",
          });
        } else if (state === "success" || state === "alert" || state === "done") {
          ws.statusBadge.setText("200 OK · DISPATCHED ✓");
          ws.statusBadge.setBackgroundColor("#059669");

          this.tweens.killTweensOf(agent.container);
          agent.container.y = agent.cfg.deskY;
        } else {
          ws.statusBadge.setText("STANDBY · READY");
          ws.statusBadge.setBackgroundColor("#1E293B");

          this.tweens.killTweensOf(agent.container);
          agent.container.y = agent.cfg.deskY;
        }
      }

      updateTheme(isDark) {
        this.currentDarkMode = isDark;
        this.renderEnvironment(isDark);
        Object.keys(this.agents).forEach((id) => {
          this.drawPod(id, this.agents[id]?.state || "idle");
          this.drawWorkstation(id);
          this.drawAvatar(id, this.agents[id]?.state || "idle");
        });
      }
    }

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerWidth,
      height: containerHeight,
      backgroundColor: darkMode ? "#07090E" : "#F8FAFC",
      scene: CyberneticCommandScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
    };

    let game = null;
    try {
      game = new Phaser.Game(config);
      gameRef.current = game;
    } catch (err) {
      console.warn("Phaser initialization safely caught:", err);
    }

    const handleResize = () => {
      try {
        if (gameRef.current && containerRef.current) {
          const newWidth = containerRef.current.clientWidth;
          gameRef.current.scale.resize(newWidth, containerHeight);
        }
      } catch (err) {
        console.warn("Resize error:", err);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      try {
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
          sceneRef.current = null;
        }
      } catch (err) {
        console.warn("Cleanup error:", err);
      }
    };
  }, []);

  useEffect(() => {
    try {
      if (sceneRef.current && typeof sceneRef.current.updateTheme === "function") {
        sceneRef.current.updateTheme(darkMode);
      }
    } catch (err) {
      console.warn("Theme update error:", err);
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      if (!sceneRef.current || !agentStates || typeof sceneRef.current.applyAgentState !== "function") return;

      if (agentStates.agent1) {
        sceneRef.current.applyAgentState("agent1", agentStates.agent1);
      }
      if (agentStates.agent2) {
        sceneRef.current.applyAgentState("agent2", agentStates.agent2);
      }
      if (agentStates.agent3) {
        sceneRef.current.applyAgentState("agent3", agentStates.agent3);
      }
    } catch (err) {
      console.warn("Agent state apply error:", err);
    }
  }, [agentStates]);

  return (
    <div className="w-full glass-panel rounded-3xl p-6 transition-all space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200/60 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.25)]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold tracking-tight text-black dark:text-white">
                Autonomous Tri-Agent Mission Control Workspace
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                LIVE TELEMETRY
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Multi-agent tactical execution for thermal compliance audit, chiller pre-cooling, and civic override
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl glass-panel-subtle border border-gray-200/60 dark:border-white/[0.08] text-xs font-mono text-gray-700 dark:text-zinc-300 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
            <span>Phaser 3 Engine · 3 Active Vector Cores</span>
          </span>
        </div>
      </div>

      {/* Phaser Simulation Canvas */}
      <div
        ref={containerRef}
        className="w-full h-[360px] rounded-2xl overflow-hidden border border-gray-200/60 dark:border-white/[0.08] relative shadow-2xl transition-colors duration-300"
        style={{ minHeight: "360px" }}
      />

      {/* 3 Executive Agent Real-Time Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Agent 1 Card */}
        <div
          className={`p-4 rounded-2xl glass-panel-subtle transition-all duration-300 flex flex-col justify-between space-y-3 ${
            agentStates.agent1 === "working"
              ? "border-amber-500/60 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
              : "hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-400">
                ROOM 101
              </span>
              <span className="text-xs font-bold text-black dark:text-white font-mono">
                Agent 1 · Thermal Audit
              </span>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                agentStates.agent1 === "working"
                  ? "bg-amber-400 animate-ping"
                  : agentStates.agent1 === "done" || agentStates.agent1 === "success"
                  ? "bg-emerald-400"
                  : "bg-gray-400 dark:bg-zinc-600"
              }`}
            />
          </div>

          <div className="text-xs text-gray-600 dark:text-zinc-300 font-mono space-y-1">
            <div className="text-[11px] text-gray-400 dark:text-zinc-500">
              Core: ASHRAE 55 & IECC RAG Vector Store
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-500">Status:</span>
              <span
                className={`font-bold ${
                  agentStates.agent1 === "working"
                    ? "text-amber-400 animate-pulse"
                    : agentStates.agent1 === "done" || agentStates.agent1 === "success"
                    ? "text-emerald-400"
                    : "text-gray-400 dark:text-zinc-400"
                }`}
              >
                {agentStates.agent1 === "working"
                  ? "Auditing Standards..."
                  : agentStates.agent1 === "done" || agentStates.agent1 === "success"
                  ? "Audit Dispatched ✓"
                  : "Standby"}
              </span>
            </div>
          </div>

          {onRunAudit && (
            <button
              onClick={onRunAudit}
              disabled={isAuditLoading}
              className="w-full py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-black shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isAuditLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Building2 className="w-3.5 h-3.5" />
              )}
              <span>{isAuditLoading ? "Auditing..." : "Trigger Audit (A1)"}</span>
            </button>
          )}
        </div>

        {/* Agent 2 Card */}
        <div
          className={`p-4 rounded-2xl glass-panel-subtle transition-all duration-300 flex flex-col justify-between space-y-3 ${
            agentStates.agent2 === "working"
              ? "border-cyan-500/60 ring-2 ring-cyan-500/20 bg-cyan-500/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
              : "hover:border-cyan-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-400">
                ROOM 102
              </span>
              <span className="text-xs font-bold text-black dark:text-white font-mono">
                Agent 2 · Pre-Cool Shift
              </span>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                agentStates.agent2 === "working"
                  ? "bg-cyan-400 animate-ping"
                  : agentStates.agent2 === "done" || agentStates.agent2 === "success"
                  ? "bg-emerald-400"
                  : "bg-gray-400 dark:bg-zinc-600"
              }`}
            />
          </div>

          <div className="text-xs text-gray-600 dark:text-zinc-300 font-mono space-y-1">
            <div className="text-[11px] text-gray-400 dark:text-zinc-500">
              Core: HVAC Chiller Peak Shifter
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-500">Status:</span>
              <span
                className={`font-bold ${
                  agentStates.agent2 === "working"
                    ? "text-cyan-400 animate-pulse"
                    : agentStates.agent2 === "done" || agentStates.agent2 === "success"
                    ? "text-emerald-400"
                    : "text-gray-400 dark:text-zinc-400"
                }`}
              >
                {agentStates.agent2 === "working"
                  ? "Shifting Peak Load..."
                  : agentStates.agent2 === "done" || agentStates.agent2 === "success"
                  ? "Pre-Cool Active ✓"
                  : "Standby"}
              </span>
            </div>
          </div>

          {onRunInfra && (
            <button
              onClick={onRunInfra}
              disabled={isInfraLoading}
              className="w-full py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-black shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isInfraLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>{isInfraLoading ? "Shifting..." : "Trigger Pre-Cool (A2)"}</span>
            </button>
          )}
        </div>

        {/* Agent 3 Card */}
        <div
          className={`p-4 rounded-2xl glass-panel-subtle transition-all duration-300 flex flex-col justify-between space-y-3 ${
            agentStates.agent3 === "working"
              ? "border-rose-500/60 ring-2 ring-rose-500/20 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
              : "hover:border-rose-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono font-bold text-rose-400">
                ROOM 103
              </span>
              <span className="text-xs font-bold text-black dark:text-white font-mono">
                Agent 3 · Civic Dispatch
              </span>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                agentStates.agent3 === "working"
                  ? "bg-rose-400 animate-ping"
                  : agentStates.agent3 === "done" || agentStates.agent3 === "alert" || agentStates.agent3 === "success"
                  ? "bg-emerald-400"
                  : "bg-gray-400 dark:bg-zinc-600"
              }`}
            />
          </div>

          <div className="text-xs text-gray-600 dark:text-zinc-300 font-mono space-y-1">
            <div className="text-[11px] text-gray-400 dark:text-zinc-500">
              Core: Liljegren WBGT Public Health Override
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-500">Status:</span>
              <span
                className={`font-bold ${
                  agentStates.agent3 === "working"
                    ? "text-rose-400 animate-pulse"
                    : agentStates.agent3 === "done" || agentStates.agent3 === "alert" || agentStates.agent3 === "success"
                    ? "text-emerald-400"
                    : "text-gray-400 dark:text-zinc-400"
                }`}
              >
                {agentStates.agent3 === "working"
                  ? "Dispatching Alert..."
                  : agentStates.agent3 === "done" || agentStates.agent3 === "alert" || agentStates.agent3 === "success"
                  ? "Alert Broadcasted ✓"
                  : "Standby"}
              </span>
            </div>
          </div>

          {onRunCivic && (
            <button
              onClick={onRunCivic}
              disabled={isCivicLoading}
              className="w-full py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isCivicLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <AlertOctagon className="w-3.5 h-3.5" />
              )}
              <span>{isCivicLoading ? "Dispatching..." : "Trigger Civic Alert (A3)"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
