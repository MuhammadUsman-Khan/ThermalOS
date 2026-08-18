import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { Building2, Laptop, DoorOpen, CheckCircle2, ShieldAlert, Sparkles, Activity, Cpu, RefreshCw, Zap, AlertOctagon } from "lucide-react";

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

    class UltraRealisticOfficeScene extends Phaser.Scene {
      constructor() {
        super({ key: "UltraRealisticOfficeScene" });
        this.agents = {};
        this.doors = {};
        this.workstations = {};
        this.currentDarkMode = darkMode;
        this.steamParticles = [];
        this.ambientDust = [];
        this.dataBursts = [];
      }

      create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.skyG = this.add.graphics();
        this.cityG = this.add.graphics();
        this.wallG = this.add.graphics();
        this.floorG = this.add.graphics();
        this.lightsG = this.add.graphics();
        this.decorG = this.add.graphics();
        this.particlesG = this.add.graphics();

        this.renderExecutiveOffice(this.currentDarkMode);

        const agentConfigs = [
          {
            id: "agent1",
            name: "AGENT 1 — ANALYST",
            role: "ASHRAE 55 & IECC RAG CORE",
            roomCode: "ROOM 101",
            roomName: "THERMAL AUDIT VAULT",
            themeColor: 0xf59e0b, // Amber Gold
            themeHex: "#F59E0B",
            outfitColor: 0xf59e0b,
            outfitAccent: 0xffedd5,
            hairColor: 0x1c1917,
            skinColor: 0xfed7aa,
            pantsColor: 0x1e293b,
            deskX: width * 0.22,
            deskY: 250,
            doorX: width * 0.22,
            doorY: 102,
          },
          {
            id: "agent2",
            name: "AGENT 2 — CONTROLLER",
            role: "HVAC PRE-COOL LOAD SHIFT",
            roomCode: "ROOM 102",
            roomName: "CHILLER PLANT CORE",
            themeColor: 0x06b6d4, // Electric Cyan
            themeHex: "#06B6D4",
            outfitColor: 0x06b6d4,
            outfitAccent: 0xcffafe,
            hairColor: 0x0f172a,
            skinColor: 0xfed7aa,
            pantsColor: 0x334155,
            deskX: width * 0.50,
            deskY: 250,
            doorX: width * 0.50,
            doorY: 102,
          },
          {
            id: "agent3",
            name: "AGENT 3 — DISPATCHER",
            role: "WBGT CIVIC HEAT DISPATCH",
            roomCode: "ROOM 103",
            roomName: "CIVIC DISPATCH HUB",
            themeColor: 0xf43f5e, // Radiant Rose
            themeHex: "#F43F5E",
            outfitColor: 0xf43f5e,
            outfitAccent: 0xffe4e6,
            hairColor: 0x451a03,
            skinColor: 0xfed7aa,
            pantsColor: 0x0f172a,
            deskX: width * 0.78,
            deskY: 250,
            doorX: width * 0.78,
            doorY: 102,
          },
        ];

        agentConfigs.forEach((cfg) => {
          // --- 1. Dedicated Wall Operations Door on Back Wall ---
          const doorContainer = this.add.container(cfg.doorX, cfg.doorY);

          const doorWallRecess = this.add.graphics();
          const doorFrame = this.add.graphics();
          const doorPanels = this.add.graphics();
          const doorLightBeam = this.add.graphics();
          const doorScanner = this.add.graphics();
          const doorFlash = this.add.graphics();

          // Room Sign Header
          const doorSign = this.add.text(0, -56, `[ ${cfg.roomCode} • ${cfg.roomName} ]`, {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "9px",
            color: cfg.themeHex,
            backgroundColor: this.currentDarkMode ? "#0F172A" : "#FFFFFF",
            padding: { x: 7, y: 3 },
            fontStyle: "bold",
            align: "center",
          }).setOrigin(0.5, 0.5);

          doorContainer.add([doorLightBeam, doorWallRecess, doorFrame, doorPanels, doorScanner, doorFlash, doorSign]);

          this.doors[cfg.id] = {
            container: doorContainer,
            doorWallRecess,
            doorFrame,
            doorPanels,
            doorLightBeam,
            doorScanner,
            doorFlash,
            doorSign,
            cfg,
            isOpen: false,
          };

          this.drawDoor(cfg.id, false, "idle");

          // --- 2. Workstation Background Layer (Floor Rug & Chair Base) ---
          const wsBackContainer = this.add.container(cfg.deskX, cfg.deskY);
          const floorRugG = this.add.graphics();
          const chairBaseG = this.add.graphics();
          wsBackContainer.add([floorRugG, chairBaseG]);

          // --- 3. Animated Agent Character Layer ---
          const agentContainer = this.add.container(cfg.deskX, cfg.deskY);
          const charShadow = this.add.graphics();
          const legsG = this.add.graphics();
          const torsoG = this.add.graphics();
          const headG = this.add.graphics();
          const armsG = this.add.graphics();
          const effectsG = this.add.graphics();

          agentContainer.add([charShadow, legsG, torsoG, headG, armsG, effectsG]);

          this.agents[cfg.id] = {
            container: agentContainer,
            charShadow,
            legsG,
            torsoG,
            headG,
            armsG,
            effectsG,
            cfg,
            baseX: cfg.deskX,
            baseY: cfg.deskY,
            doorX: cfg.doorX,
            doorY: cfg.doorY + 32,
            tweens: [],
            state: "idle",
          };

          // --- 4. Workstation Foreground Layer (Desk, Dual Displays, Laptop, Lamp) ---
          const wsFrontContainer = this.add.container(cfg.deskX, cfg.deskY);
          const deskG = this.add.graphics();
          const deskMatG = this.add.graphics();
          const monitorsG = this.add.graphics();
          const laptopG = this.add.graphics();
          const accessoriesG = this.add.graphics();

          // Monospace Nameplate safely below desk
          const nameLabel = this.add.text(0, 64, cfg.name, {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "11px",
            color: cfg.themeHex,
            fontStyle: "bold",
            align: "center",
          }).setOrigin(0.5, 0.5);

          const roleLabel = this.add.text(0, 80, cfg.role, {
            fontFamily: "Inter, sans-serif",
            fontSize: "9.5px",
            color: this.currentDarkMode ? "#CBD5E1" : "#475569",
            fontWeight: "600",
            align: "center",
          }).setOrigin(0.5, 0.5);

          // Top Status Badge Pill
          const stateBadge = this.add.text(0, -70, "IDLE — AT WORKSTATION", {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "9px",
            color: "#FFFFFF",
            backgroundColor: "#1E293B",
            padding: { x: 8, y: 3.5 },
            align: "center",
          }).setOrigin(0.5, 0.5);

          wsFrontContainer.add([deskG, deskMatG, monitorsG, laptopG, accessoriesG, nameLabel, roleLabel, stateBadge]);

          this.workstations[cfg.id] = {
            backContainer: wsBackContainer,
            frontContainer: wsFrontContainer,
            floorRugG,
            chairBaseG,
            deskG,
            deskMatG,
            monitorsG,
            laptopG,
            accessoriesG,
            nameLabel,
            roleLabel,
            stateBadge,
            cfg,
          };

          this.drawWorkstation(cfg.id);
          this.applyAgentState(cfg.id, "idle");
        });

        // Steam particles for coffee mugs
        agentConfigs.forEach((cfg) => {
          this.steamParticles.push({
            x: cfg.deskX + 38,
            baseY: cfg.deskY - 14,
            y: cfg.deskY - 14,
            alpha: 0.8,
            speedY: Phaser.Math.FloatBetween(0.3, 0.5),
          });
        });

        // Ambient Floating Cyber Dust Motives
        for (let i = 0; i < 20; i++) {
          this.ambientDust.push({
            x: Phaser.Math.Between(0, width),
            y: Phaser.Math.Between(0, height),
            speedX: Phaser.Math.FloatBetween(-0.15, 0.15),
            speedY: Phaser.Math.FloatBetween(-0.35, -0.1),
            size: Phaser.Math.FloatBetween(1, 2.2),
            alpha: Phaser.Math.FloatBetween(0.2, 0.5),
          });
        }

        sceneRef.current = this;
      }

      update() {
        this.particlesG.clear();

        // 1. Animate Coffee Steam
        this.steamParticles.forEach((p) => {
          p.y -= p.speedY;
          p.alpha -= 0.016;
          if (p.alpha <= 0 || p.y < p.baseY - 18) {
            p.y = p.baseY;
            p.alpha = 0.8;
          }
          this.particlesG.fillStyle(this.currentDarkMode ? 0xffffff : 0x94a3b8, p.alpha * 0.45);
          this.particlesG.fillCircle(p.x, p.y, 1.8);
        });

        // 2. Animate Ambient Dust
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.ambientDust.forEach((d) => {
          d.x += d.speedX;
          d.y += d.speedY;
          if (d.y < 0) {
            d.y = height;
            d.x = Phaser.Math.Between(0, width);
          }
          if (d.x < 0) d.x = width;
          if (d.x > width) d.x = 0;

          this.particlesG.fillStyle(this.currentDarkMode ? 0x38bdf8 : 0x0284c7, d.alpha * 0.35);
          this.particlesG.fillCircle(d.x, d.y, d.size);
        });
      }

      // Render High-Contrast Executive Office Architecture & Panoramic Cityscape
      renderExecutiveOffice(isDark) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const horizonY = 155;

        this.skyG.clear();
        this.cityG.clear();
        this.wallG.clear();
        this.floorG.clear();
        this.lightsG.clear();
        this.decorG.clear();

        if (isDark) {
          // Night City Sky
          this.skyG.fillStyle(0x0f172a, 1);
          this.skyG.fillRect(0, 0, width, horizonY);

          // Glowing City Skyline in Panoramic Windows
          this.cityG.fillStyle(0x1e293b, 1);
          const towers = [
            { x: 30, w: 50, h: 90 },
            { x: 90, w: 65, h: 120 },
            { x: 170, w: 45, h: 75 },
            { x: 320, w: 80, h: 110 },
            { x: 420, w: 55, h: 85 },
            { x: 600, w: 90, h: 130 },
            { x: 710, w: 60, h: 95 },
            { x: 840, w: 75, h: 115 },
          ];
          towers.forEach((t) => {
            this.cityG.fillRect(t.x, horizonY - t.h, t.w, t.h);
            for (let wy = horizonY - t.h + 10; wy < horizonY - 10; wy += 12) {
              for (let wx = t.x + 8; wx < t.x + t.w - 8; wx += 10) {
                if (Math.sin(wx * wy) > -0.15) {
                  this.cityG.fillStyle(Math.sin(wx) > 0 ? 0xfde047 : 0x38bdf8, 0.75);
                  this.cityG.fillRect(wx, wy, 4, 6);
                }
              }
            }
          });

          // Architectural Wall Framing
          this.wallG.fillStyle(0x1e293b, 1);
          this.wallG.fillRect(0, 0, width * 0.12, horizonY);
          this.wallG.fillRect(width * 0.36, 0, width * 0.04, horizonY);
          this.wallG.fillRect(width * 0.64, 0, width * 0.04, horizonY);
          this.wallG.fillRect(width * 0.88, 0, width * 0.12, horizonY);

          this.wallG.fillStyle(0x334155, 1);
          this.wallG.fillRect(0, 0, width, 18);
          this.wallG.fillRect(0, horizonY - 6, width, 8);

          // LED Horizon Baseboard Strip
          this.lightsG.lineStyle(2.5, 0x38bdf8, 0.65);
          this.lightsG.lineBetween(0, horizonY + 1, width, horizonY + 1);

          // High-Contrast Hardwood Floor
          this.floorG.fillStyle(0x27272a, 1);
          this.floorG.fillRect(0, horizonY, width, height - horizonY);

          this.floorG.lineStyle(1.2, 0x3f3f46, 0.8);
          for (let y = horizonY; y <= height; y += 22) {
            this.floorG.lineBetween(0, y, width, y);
          }
          for (let x = 0; x <= width; x += 60) {
            this.floorG.lineBetween(x, horizonY, x, height);
          }

          // Ceiling Downlight Cones
          const bays = [width * 0.22, width * 0.50, width * 0.78];
          bays.forEach((bx) => {
            this.lightsG.fillStyle(0xffffff, 0.08);
            this.lightsG.beginPath();
            this.lightsG.moveTo(bx, 0);
            this.lightsG.lineTo(bx - 70, horizonY + 55);
            this.lightsG.lineTo(bx + 70, horizonY + 55);
            this.lightsG.closePath();
            this.lightsG.fillPath();
          });

          this.drawFoliage(width * 0.05, horizonY + 16, true);
          this.drawFoliage(width * 0.95, horizonY + 16, true);
        } else {
          // Daylight Scandinavian Office
          this.skyG.fillStyle(0xdbeafe, 1);
          this.skyG.fillRect(0, 0, width, horizonY);

          this.cityG.fillStyle(0x93c5fd, 0.75);
          const towers = [
            { x: 30, w: 50, h: 90 },
            { x: 90, w: 65, h: 120 },
            { x: 170, w: 45, h: 75 },
            { x: 320, w: 80, h: 110 },
            { x: 420, w: 55, h: 85 },
            { x: 600, w: 90, h: 130 },
            { x: 710, w: 60, h: 95 },
            { x: 840, w: 75, h: 115 },
          ];
          towers.forEach((t) => {
            this.cityG.fillRect(t.x, horizonY - t.h, t.w, t.h);
          });

          this.wallG.fillStyle(0xe2e8f0, 1);
          this.wallG.fillRect(0, 0, width * 0.12, horizonY);
          this.wallG.fillRect(width * 0.36, 0, width * 0.04, horizonY);
          this.wallG.fillRect(width * 0.64, 0, width * 0.04, horizonY);
          this.wallG.fillRect(width * 0.88, 0, width * 0.12, horizonY);

          this.wallG.fillStyle(0xcbd5e1, 1);
          this.wallG.fillRect(0, 0, width, 18);
          this.wallG.fillRect(0, horizonY - 6, width, 8);

          this.floorG.fillStyle(0xf1f5f9, 1);
          this.floorG.fillRect(0, horizonY, width, height - horizonY);

          this.floorG.lineStyle(1.2, 0xcbd5e1, 0.8);
          for (let y = horizonY; y <= height; y += 22) {
            this.floorG.lineBetween(0, y, width, y);
          }
          for (let x = 0; x <= width; x += 60) {
            this.floorG.lineBetween(x, horizonY, x, height);
          }

          const bays = [width * 0.22, width * 0.50, width * 0.78];
          bays.forEach((bx) => {
            this.lightsG.fillStyle(0xffffff, 0.45);
            this.lightsG.beginPath();
            this.lightsG.moveTo(bx, 0);
            this.lightsG.lineTo(bx - 70, horizonY + 55);
            this.lightsG.lineTo(bx + 70, horizonY + 55);
            this.lightsG.closePath();
            this.lightsG.fillPath();
          });

          this.drawFoliage(width * 0.05, horizonY + 16, false);
          this.drawFoliage(width * 0.95, horizonY + 16, false);
        }
      }

      drawFoliage(x, y, isDark) {
        const g = this.decorG;
        g.fillStyle(isDark ? 0x334155 : 0x94a3b8, 1);
        g.fillRoundedRect(x - 12, y + 2, 24, 26, 4);

        g.fillStyle(0x047857, 0.95);
        g.fillCircle(x, y - 8, 15);
        g.fillStyle(0x10b981, 0.95);
        g.fillCircle(x - 6, y - 14, 12);
        g.fillCircle(x + 6, y - 14, 12);
        g.fillStyle(0x34d399, 0.9);
        g.fillCircle(x, y - 18, 9);
      }

      updateTheme(isDark) {
        this.currentDarkMode = isDark;
        this.renderExecutiveOffice(isDark);

        Object.keys(this.doors).forEach((id) => {
          this.drawDoor(id, this.doors[id].isOpen, this.agents[id]?.state || "idle");
          if (this.doors[id].doorSign) {
            this.doors[id].doorSign.setBackgroundColor(isDark ? "#0F172A" : "#FFFFFF");
          }
        });

        Object.keys(this.workstations).forEach((id) => {
          this.drawWorkstation(id);
          if (this.workstations[id].roleLabel) {
            this.workstations[id].roleLabel.setColor(isDark ? "#CBD5E1" : "#475569");
          }
        });

        Object.keys(this.agents).forEach((id) => {
          this.applyAgentState(id, this.agents[id].state);
        });
      }

      // --- 1. DEDICATED OPERATIONS DOOR ---
      drawDoor(agentId, isOpen = false, state = "idle") {
        const door = this.doors[agentId];
        if (!door) return;

        const { doorWallRecess, doorFrame, doorPanels, doorLightBeam, doorScanner, doorFlash, cfg } = door;
        doorWallRecess.clear();
        doorFrame.clear();
        doorPanels.clear();
        doorLightBeam.clear();
        doorScanner.clear();
        doorFlash.clear();

        const dw = 58;
        const dh = 80;
        const mainColor = state === "alert" ? 0xef4444 : cfg.themeColor;

        // Wall Cavity Recess
        doorWallRecess.fillStyle(0x020617, 0.6);
        doorWallRecess.fillRect(-dw / 2 - 4, -dh / 2 - 4, dw + 8, dh + 8);

        // Anodized Aluminum Outer Door Frame
        doorFrame.fillStyle(this.currentDarkMode ? 0x334155 : 0x475569, 1);
        doorFrame.fillRoundedRect(-dw / 2 - 3, -dh / 2 - 3, dw + 6, dh + 6, 3);
        doorFrame.lineStyle(2.5, mainColor, 1);
        doorFrame.strokeRoundedRect(-dw / 2 - 3, -dh / 2 - 3, dw + 6, dh + 6, 3);

        if (isOpen) {
          // Open Interior Chamber Radiant Glow with Server Blade Lights
          doorPanels.fillStyle(mainColor, 0.45);
          doorPanels.fillRect(-dw / 2, -dh / 2, dw, dh);
          doorPanels.fillStyle(0xffffff, 0.95);
          doorPanels.fillRect(-dw / 2 + 8, -dh / 2 + 6, dw - 16, dh - 12);

          // Server Activity Blinks inside open vault
          doorPanels.fillStyle(0x10b981, 0.9);
          doorPanels.fillCircle(-dw / 2 + 14, -dh / 2 + 14, 2);
          doorPanels.fillCircle(-dw / 2 + 14, -dh / 2 + 22, 2);
          doorPanels.fillStyle(cfg.themeColor, 0.9);
          doorPanels.fillCircle(dw / 2 - 14, -dh / 2 + 14, 2);
          doorPanels.fillCircle(dw / 2 - 14, -dh / 2 + 22, 2);

          // Radiant Light Spill Spreading on Hardwood Floor
          doorLightBeam.fillStyle(mainColor, this.currentDarkMode ? 0.38 : 0.28);
          doorLightBeam.beginPath();
          doorLightBeam.moveTo(-dw / 2, dh / 2);
          doorLightBeam.lineTo(dw / 2, dh / 2);
          doorLightBeam.lineTo(dw / 2 + 40, dh / 2 + 58);
          doorLightBeam.lineTo(-dw / 2 - 40, dh / 2 + 58);
          doorLightBeam.closePath();
          doorLightBeam.fillPath();

          // Left/Right Slid-Open Door Slabs
          doorPanels.fillStyle(this.currentDarkMode ? 0x475569 : 0x64748b, 1);
          doorPanels.fillRect(-dw / 2 - 2, -dh / 2, 8, dh);
          doorPanels.fillRect(dw / 2 - 6, -dh / 2, 8, dh);
        } else {
          // Closed Frosted Glass Door Panel
          doorPanels.fillStyle(this.currentDarkMode ? 0x1e293b : 0xffffff, 1);
          doorPanels.fillRect(-dw / 2, -dh / 2, dw, dh);

          // Glass Viewport Slit
          doorPanels.fillStyle(mainColor, 0.35);
          doorPanels.fillRect(-14, -dh / 2 + 12, 28, 36);
          doorPanels.lineStyle(1.8, mainColor, 0.95);
          doorPanels.strokeRect(-14, -dh / 2 + 12, 28, 36);

          // Electronic Handle
          doorPanels.fillStyle(mainColor, 1);
          doorPanels.fillRoundedRect(dw / 2 - 10, -4, 4, 18, 1.5);
        }

        // Biometric Card Scanner Terminal
        const scanColor = state === "alert" ? 0xef4444 : state === "working" ? 0x38bdf8 : 0x10b981;
        doorScanner.fillStyle(this.currentDarkMode ? 0x0f172a : 0x1e293b, 1);
        doorScanner.fillRoundedRect(dw / 2 + 8, -8, 8, 16, 2);
        doorScanner.fillStyle(scanColor, 1);
        doorScanner.fillCircle(dw / 2 + 12, 0, 2);
      }

      // Trigger Badge Swipe Laser Ripple Animation
      triggerCardSwipeFlash(agentId) {
        const door = this.doors[agentId];
        if (!door) return;

        door.doorFlash.clear();
        door.doorFlash.lineStyle(2, door.cfg.themeColor, 1);
        door.doorFlash.strokeCircle(58 / 2 + 12, 0, 10);

        this.tweens.add({
          targets: door.doorFlash,
          alpha: { from: 1, to: 0 },
          duration: 350,
          onComplete: () => {
            door.doorFlash.clear();
            door.doorFlash.alpha = 1;
          },
        });
      }

      // --- 2. EXECUTIVE WORKSTATION ---
      drawWorkstation(agentId) {
        const ws = this.workstations[agentId];
        if (!ws) return;

        const { floorRugG, chairBaseG, deskG, deskMatG, monitorsG, laptopG, accessoriesG, cfg } = ws;
        floorRugG.clear();
        chairBaseG.clear();
        deskG.clear();
        deskMatG.clear();
        monitorsG.clear();
        laptopG.clear();
        accessoriesG.clear();

        // 1. High-Contrast Area Rug
        floorRugG.fillStyle(this.currentDarkMode ? 0x334155 : 0xe2e8f0, 0.6);
        floorRugG.fillRoundedRect(-58, -32, 116, 74, 8);
        floorRugG.lineStyle(2, cfg.themeColor, 0.65);
        floorRugG.strokeRoundedRect(-58, -32, 116, 74, 8);

        // 2. Ergonomic Mesh Chair (Back Layer)
        const chairColor = this.currentDarkMode ? 0x334155 : 0x475569;
        chairBaseG.fillStyle(0x0f172a, 1);
        chairBaseG.fillRect(-15, 18, 30, 4);
        chairBaseG.fillCircle(-15, 22, 2);
        chairBaseG.fillCircle(15, 22, 2);
        chairBaseG.fillCircle(0, 22, 2);

        chairBaseG.fillStyle(0x94a3b8, 1);
        chairBaseG.fillRect(-2, 4, 4, 14);

        chairBaseG.fillStyle(this.currentDarkMode ? 0x1e293b : 0x334155, 1);
        chairBaseG.fillRoundedRect(-20, -2, 40, 8, 3);

        chairBaseG.fillStyle(chairColor, 1);
        chairBaseG.fillRoundedRect(-17, -34, 34, 32, 5);

        chairBaseG.fillStyle(0x0f172a, 1);
        chairBaseG.fillRect(-13, -16, 26, 6);

        chairBaseG.fillStyle(chairColor, 1);
        chairBaseG.fillRoundedRect(-11, -42, 22, 7, 2);

        // 3. Crisp Executive Desk (High Contrast White Desktop)
        deskG.fillStyle(0xffffff, 1);
        deskG.fillRoundedRect(-46, -14, 92, 30, 4);
        deskG.lineStyle(1.5, this.currentDarkMode ? 0x94a3b8 : 0xcbd5e1, 1);
        deskG.strokeRoundedRect(-46, -14, 92, 30, 4);

        deskG.fillStyle(this.currentDarkMode ? 0x1e293b : 0x475569, 1);
        deskG.fillRect(-44, 16, 4, 16);
        deskG.fillRect(40, 16, 4, 16);

        // 4. Large Dark Desk Mat
        deskMatG.fillStyle(0x0f172a, 1);
        deskMatG.fillRoundedRect(-34, -10, 68, 22, 3);

        // 5. Dual Monitor Setup: Apple Studio Display + Open MacBook
        monitorsG.fillStyle(0x64748b, 1);
        monitorsG.fillRect(-19, -10, 10, 3);
        monitorsG.fillRect(-15, -18, 2, 8);

        monitorsG.fillStyle(0x020617, 1);
        monitorsG.fillRoundedRect(-30, -34, 30, 20, 2);
        monitorsG.lineStyle(1.2, cfg.themeColor, 1);
        monitorsG.strokeRoundedRect(-30, -34, 30, 20, 2);

        monitorsG.fillStyle(cfg.themeColor, 1);
        monitorsG.fillRect(-28, -31, 26, 2.5);
        monitorsG.fillRect(-28, -26, 18, 2.5);
        monitorsG.fillRect(-28, -21, 23, 2.5);

        // Open MacBook on Stand
        laptopG.fillStyle(0x64748b, 1);
        laptopG.fillRoundedRect(7, -8, 22, 8, 1.5);
        laptopG.fillStyle(0x020617, 1);
        laptopG.fillRoundedRect(9, -22, 18, 14, 1.5);
        laptopG.lineStyle(1.2, cfg.themeColor, 0.95);
        laptopG.strokeRoundedRect(9, -22, 18, 14, 1.5);
        laptopG.fillStyle(cfg.themeColor, 1);
        laptopG.fillRect(11, -19, 14, 2);
        laptopG.fillRect(11, -15, 9, 2);

        // 6. Accessories: Steaming Coffee Mug + Designer Desk Lamp
        accessoriesG.fillStyle(0xffffff, 1);
        accessoriesG.fillRoundedRect(34, -7, 8, 10, 2);
        accessoriesG.fillStyle(0x78350f, 1);
        accessoriesG.fillCircle(38, -6, 2.5);

        accessoriesG.fillStyle(cfg.themeColor, 1);
        accessoriesG.fillRect(-41, -6, 4, 3);
        accessoriesG.lineStyle(1.8, cfg.themeColor, 1);
        accessoriesG.lineBetween(-39, -6, -39, -24);
        accessoriesG.lineBetween(-39, -24, -33, -22);
        accessoriesG.fillStyle(0xfef08a, 1);
        accessoriesG.fillCircle(-33, -22, 2.8);
      }

      // --- 3. ANIMATED HUMAN AGENT CHARACTER WITH ARTICULATED POSES ---
      drawCharacter(agentId, pose = "sitting", walkAngle = 0, facing = "forward") {
        const agent = this.agents[agentId];
        if (!agent) return;

        const { legsG, torsoG, headG, armsG, charShadow, effectsG, cfg } = agent;
        legsG.clear();
        torsoG.clear();
        headG.clear();
        armsG.clear();
        charShadow.clear();
        effectsG.clear();

        const skin = cfg.skinColor;
        const shirt = cfg.outfitColor;
        const hair = cfg.hairColor;

        if (pose === "sitting") {
          // Seated at Workstation Typing
          const cy = 0;

          charShadow.fillStyle(0x000000, 0.4);
          charShadow.fillEllipse(0, cy + 24, 30, 8);

          legsG.fillStyle(0x1e293b, 1);
          legsG.fillRect(-9, cy + 4, 7, 16);
          legsG.fillRect(2, cy + 4, 7, 16);
          legsG.fillStyle(0x020617, 1);
          legsG.fillRoundedRect(-10, cy + 18, 9, 5, 1.5);
          legsG.fillRoundedRect(1, cy + 18, 9, 5, 1.5);

          torsoG.fillStyle(shirt, 1);
          torsoG.fillRoundedRect(-12, cy - 16, 24, 21, 4);
          torsoG.lineStyle(1.5, 0xffffff, 0.9);
          torsoG.lineBetween(0, cy - 14, 0, cy + 4);

          headG.fillStyle(skin, 1);
          headG.fillCircle(0, cy - 24, 10);
          headG.fillStyle(hair, 1);
          headG.fillCircle(0, cy - 28, 10.5);
          headG.fillRect(-10, cy - 30, 20, 7);

          headG.fillStyle(cfg.themeColor, 1);
          headG.fillRoundedRect(-8, cy - 25, 7, 4.5, 1);
          headG.fillRoundedRect(1, cy - 25, 7, 4.5, 1);
          headG.lineStyle(1, cfg.themeColor, 1);
          headG.lineBetween(-1, cy - 24, 1, cy - 24);

          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(-10, cy - 11, -6, cy - 1);
          armsG.lineBetween(-6, cy - 1, -2, cy + 2);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(-2, cy + 2, 2.5);

          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(10, cy - 11, 6, cy - 1);
          armsG.lineBetween(6, cy - 1, 2, cy + 2);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(2, cy + 2, 2.5);
        } else if (pose === "walking_up") {
          // Walking towards door (Facing away/upwards into room)
          const cy = 0;

          charShadow.fillStyle(0x000000, 0.4);
          charShadow.fillEllipse(0, cy + 28, 26, 8);

          const legLen = 22;
          const footLX = -5 + Math.sin(walkAngle) * legLen;
          const footLY = cy + 4 + Math.cos(walkAngle) * legLen;
          const footRX = 5 + Math.sin(-walkAngle) * legLen;
          const footRY = cy + 4 + Math.cos(-walkAngle) * legLen;

          legsG.lineStyle(5.5, 0x1e293b, 1);
          legsG.lineBetween(-5, cy + 4, footLX, footLY);
          legsG.fillStyle(0x020617, 1);
          legsG.fillRoundedRect(footLX - 4, footLY - 2, 8, 5, 1.5);

          legsG.lineStyle(5.5, 0x1e293b, 1);
          legsG.lineBetween(5, cy + 4, footRX, footRY);
          legsG.fillStyle(0x020617, 1);
          legsG.fillRoundedRect(footRX - 4, footRY - 2, 8, 5, 1.5);

          // Back of Torso
          torsoG.fillStyle(shirt, 1);
          torsoG.fillRoundedRect(-11, cy - 17, 22, 21, 4);

          // Back of Head & Hair
          headG.fillStyle(hair, 1);
          headG.fillCircle(0, cy - 26, 10.5);
          headG.fillRoundedRect(-10, cy - 28, 20, 10, 3);

          // Arm swing holding keycard in hand
          const armSwing = Math.sin(-walkAngle) * 8;
          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(-10, cy - 13, -10 + armSwing, cy + 2);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(-10 + armSwing, cy + 2, 2.5);

          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(10, cy - 13, 10 - armSwing, cy + 2);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(10 - armSwing, cy + 2, 2.5);
          // Keycard in hand
          armsG.fillStyle(cfg.themeColor, 1);
          armsG.fillRect(10 - armSwing - 1, cy + 1, 4, 3);
        } else if (pose === "swiping_badge") {
          // Standing in front of door swiping badge scanner
          const cy = 0;

          charShadow.fillStyle(0x000000, 0.4);
          charShadow.fillEllipse(0, cy + 28, 26, 8);

          legsG.fillStyle(0x1e293b, 1);
          legsG.fillRect(-8, cy + 4, 6, 22);
          legsG.fillRect(2, cy + 4, 6, 22);
          legsG.fillStyle(0x020617, 1);
          legsG.fillRoundedRect(-9, cy + 24, 8, 5, 1.5);
          legsG.fillRoundedRect(1, cy + 24, 8, 5, 1.5);

          torsoG.fillStyle(shirt, 1);
          torsoG.fillRoundedRect(-11, cy - 17, 22, 21, 4);

          headG.fillStyle(skin, 1);
          headG.fillCircle(0, cy - 26, 10);
          headG.fillStyle(hair, 1);
          headG.fillCircle(0, cy - 30, 10.5);

          // Right Arm raised high to card reader with Keycard
          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(8, cy - 13, 16, cy - 22);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(16, cy - 22, 2.5);
          // Glowing Keycard
          armsG.fillStyle(cfg.themeColor, 1);
          armsG.fillRect(15, cy - 24, 5, 3.5);

          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(-8, cy - 13, -8, cy + 4);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(-8, cy + 4, 2.5);
        } else if (pose === "operating_inside") {
          // Inside Door Operating Terminal with Holographic Data Sparks
          const cy = 0;

          charShadow.fillStyle(0x000000, 0.4);
          charShadow.fillEllipse(0, cy + 28, 26, 8);

          legsG.fillStyle(0x1e293b, 1);
          legsG.fillRect(-8, cy + 4, 6, 22);
          legsG.fillRect(2, cy + 4, 6, 22);
          legsG.fillStyle(0x020617, 1);
          legsG.fillRoundedRect(-9, cy + 24, 8, 5, 1.5);
          legsG.fillRoundedRect(1, cy + 24, 8, 5, 1.5);

          torsoG.fillStyle(shirt, 1);
          torsoG.fillRoundedRect(-11, cy - 17, 22, 21, 4);

          headG.fillStyle(skin, 1);
          headG.fillCircle(0, cy - 26, 10);
          headG.fillStyle(hair, 1);
          headG.fillCircle(0, cy - 30, 10.5);

          // Dual arms operating holographic terminal
          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(-8, cy - 13, -4, cy - 20);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(-4, cy - 20, 2.5);

          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(8, cy - 13, 4, cy - 20);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(4, cy - 20, 2.5);

          // Holographic Data Sparkles
          effectsG.fillStyle(cfg.themeColor, 0.9);
          effectsG.fillCircle(-5, cy - 25, 2);
          effectsG.fillCircle(5, cy - 25, 2);
          effectsG.fillCircle(0, cy - 28, 2.5);
        } else if (pose === "walking_down_victory") {
          // Walking Back from door with confident celebratory posture
          const cy = 0;

          charShadow.fillStyle(0x000000, 0.4);
          charShadow.fillEllipse(0, cy + 28, 26, 8);

          const legLen = 22;
          const footLX = -4 + Math.sin(walkAngle) * legLen;
          const footLY = cy + 4 + Math.cos(walkAngle) * legLen;
          const footRX = 4 + Math.sin(-walkAngle) * legLen;
          const footRY = cy + 4 + Math.cos(-walkAngle) * legLen;

          legsG.lineStyle(5.5, 0x1e293b, 1);
          legsG.lineBetween(-4, cy + 4, footLX, footLY);
          legsG.fillStyle(0x020617, 1);
          legsG.fillRoundedRect(footLX - 4, footLY - 2, 8, 5, 1.5);

          legsG.lineStyle(5.5, 0x1e293b, 1);
          legsG.lineBetween(4, cy + 4, footRX, footRY);
          legsG.fillStyle(0x020617, 1);
          legsG.fillRoundedRect(footRX - 4, footRY - 2, 8, 5, 1.5);

          torsoG.fillStyle(shirt, 1);
          torsoG.fillRoundedRect(-11, cy - 17, 22, 21, 4);
          torsoG.lineStyle(1.5, 0xffffff, 0.9);
          torsoG.lineBetween(0, cy - 15, 0, cy + 3);

          headG.fillStyle(skin, 1);
          headG.fillCircle(0, cy - 26, 10);
          headG.fillStyle(hair, 1);
          headG.fillCircle(0, cy - 30, 10.5);
          headG.fillRect(-10, cy - 32, 20, 7);

          headG.fillStyle(cfg.themeColor, 1);
          headG.fillRoundedRect(-8, cy - 27, 7, 4.5, 1);
          headG.fillRoundedRect(1, cy - 27, 7, 4.5, 1);

          // Right Arm Raised in subtle Fist-Pump / Victory!
          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(9, cy - 13, 14, cy - 22);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(14, cy - 22, 3);

          // Left Arm swinging naturally
          const armSwing = Math.sin(-walkAngle) * 8;
          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(-10, cy - 13, -10 + armSwing, cy + 2);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(-10 + armSwing, cy + 2, 2.5);
        } else {
          // Standard Forward Walking
          const cy = 0;

          charShadow.fillStyle(0x000000, 0.4);
          charShadow.fillEllipse(0, cy + 28, 26, 8);

          const legLen = 22;
          const footLX = -4 + Math.sin(walkAngle) * legLen;
          const footLY = cy + 4 + Math.cos(walkAngle) * legLen;
          const footRX = 4 + Math.sin(-walkAngle) * legLen;
          const footRY = cy + 4 + Math.cos(-walkAngle) * legLen;

          legsG.lineStyle(5.5, 0x1e293b, 1);
          legsG.lineBetween(-4, cy + 4, footLX, footLY);
          legsG.fillStyle(0x020617, 1);
          legsG.fillRoundedRect(footLX - 4, footLY - 2, 8, 5, 1.5);

          legsG.lineStyle(5.5, 0x1e293b, 1);
          legsG.lineBetween(4, cy + 4, footRX, footRY);
          legsG.fillStyle(0x020617, 1);
          legsG.fillRoundedRect(footRX - 4, footRY - 2, 8, 5, 1.5);

          torsoG.fillStyle(shirt, 1);
          torsoG.fillRoundedRect(-11, cy - 17, 22, 21, 4);
          torsoG.lineStyle(1.5, 0xffffff, 0.9);
          torsoG.lineBetween(0, cy - 15, 0, cy + 3);

          headG.fillStyle(skin, 1);
          headG.fillCircle(0, cy - 26, 10);
          headG.fillStyle(hair, 1);
          headG.fillCircle(0, cy - 30, 10.5);
          headG.fillRect(-10, cy - 32, 20, 7);

          headG.fillStyle(cfg.themeColor, 1);
          headG.fillRoundedRect(-8, cy - 27, 7, 4.5, 1);
          headG.fillRoundedRect(1, cy - 27, 7, 4.5, 1);

          const armSwing = Math.sin(-walkAngle) * 8;
          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(-10, cy - 13, -10 + armSwing, cy + 2);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(-10 + armSwing, cy + 2, 2.5);

          armsG.lineStyle(3.5, shirt, 1);
          armsG.lineBetween(10, cy - 13, 10 - armSwing, cy + 2);
          armsG.fillStyle(skin, 1);
          armsG.fillCircle(10 - armSwing, cy + 2, 2.5);
        }
      }

      stopAgentTweens(agent) {
        if (agent.tweens && agent.tweens.length > 0) {
          agent.tweens.forEach((t) => {
            if (t) t.stop();
          });
          agent.tweens = [];
        }
      }

      // --- STATE MACHINE WORKFLOW (FULL DOOR DEPLOYMENT CYCLE) ---
      applyAgentState(agentId, state) {
        const agent = this.agents[agentId];
        const ws = this.workstations[agentId];
        if (!agent || !ws) return;

        agent.state = state;
        this.stopAgentTweens(agent);

        const badgeTexts = {
          idle: "IDLE — AT WORKSTATION",
          thinking: "ANALYZING TELEMETRY",
          working: "EXECUTING AT DOOR",
          success: "SUCCESS — VERIFIED",
          alert: "EMERGENCY ALERT",
        };

        const badgeStyles = {
          idle: { bg: "#1E293B", text: "#F8FAFC" },
          thinking: { bg: "#78350F", text: "#FDE68A" },
          working: { bg: "#164E63", text: "#A5F3FC" },
          success: { bg: "#14532D", text: "#BBF7D0" },
          alert: { bg: "#7F1D1D", text: "#FECACA" },
        };

        ws.stateBadge.setText(badgeTexts[state] || "IDLE");
        const badge = badgeStyles[state] || badgeStyles.idle;
        ws.stateBadge.setBackgroundColor(badge.bg);
        ws.stateBadge.setColor(badge.text);

        switch (state) {
          case "thinking": {
            // Agent stands up from chair into the walkway aisle and paces thoughtfully
            this.drawDoor(agentId, false, "thinking");
            this.drawCharacter(agentId, "walking", 0.2);

            const standTween = this.tweens.add({
              targets: agent.container,
              x: agent.baseX,
              y: agent.baseY - 16,
              duration: 350,
              ease: "Sine.easeOut",
            });

            const paceTween = this.tweens.add({
              targets: agent.container,
              x: { from: agent.baseX - 18, to: agent.baseX + 18 },
              duration: 1200,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });

            const walkObj = { angle: -0.28 };
            const legTween = this.tweens.add({
              targets: walkObj,
              angle: 0.28,
              duration: 300,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
              onUpdate: () => {
                this.drawCharacter(agentId, "walking", walkObj.angle);
              },
            });

            agent.tweens.push(standTween, paceTween, legTween);
            break;
          }

          case "working": {
            // STEP 1: Walk from desk straight up to the door
            this.drawCharacter(agentId, "walking_up", 0.3);

            const walkToDoorTween = this.tweens.add({
              targets: agent.container,
              x: agent.doorX,
              y: agent.doorY,
              duration: 900,
              ease: "Power2.easeInOut",
              onComplete: () => {
                // STEP 2: Swipe badge on card scanner with flash
                this.drawCharacter(agentId, "swiping_badge");
                this.triggerCardSwipeFlash(agentId);

                // STEP 3: Door slides open after authentication (300ms delay)
                this.time.delayedCall(300, () => {
                  this.doors[agentId].isOpen = true;
                  this.drawDoor(agentId, true, "working");

                  // Step slightly forward into doorway & operate terminal
                  this.tweens.add({
                    targets: agent.container,
                    y: agent.doorY - 6,
                    duration: 300,
                    onComplete: () => {
                      this.drawCharacter(agentId, "operating_inside");
                    },
                  });
                });
              },
            });

            const walkObj = { angle: -0.32 };
            const legTween = this.tweens.add({
              targets: walkObj,
              angle: 0.32,
              duration: 260,
              yoyo: true,
              repeat: 4,
              ease: "Sine.easeInOut",
              onUpdate: () => {
                this.drawCharacter(agentId, "walking_up", walkObj.angle);
              },
            });

            agent.tweens.push(walkToDoorTween, legTween);
            break;
          }

          case "success": {
            // STEP 1: Door confirms and closes with mechanical seal
            this.doors[agentId].isOpen = false;
            this.drawDoor(agentId, false, "idle");

            // STEP 2: Turn around with celebratory fist-pump pose & walk back down to workstation
            this.drawCharacter(agentId, "walking_down_victory", 0.3);

            const walkBackTween = this.tweens.add({
              targets: agent.container,
              x: agent.baseX,
              y: agent.baseY,
              duration: 1000,
              ease: "Power2.easeInOut",
              onComplete: () => {
                // STEP 3: Smoothly sits back into Aeron chair at desk
                this.drawCharacter(agentId, "sitting");
              },
            });

            const walkObj = { angle: -0.32 };
            const legTween = this.tweens.add({
              targets: walkObj,
              angle: 0.32,
              duration: 260,
              yoyo: true,
              repeat: 4,
              ease: "Sine.easeInOut",
              onUpdate: () => {
                this.drawCharacter(agentId, "walking_down_victory", walkObj.angle);
              },
            });

            agent.tweens.push(walkBackTween, legTween);
            break;
          }

          case "alert": {
            this.drawDoor(agentId, false, "alert");
            this.drawCharacter(agentId, "walking", 0);

            agent.container.x = agent.baseX + 18;
            agent.container.y = agent.baseY - 10;

            const alertJitter = this.tweens.add({
              targets: agent.container,
              x: { from: agent.baseX + 16, to: agent.baseX + 20 },
              duration: 110,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });

            agent.tweens.push(alertJitter);
            break;
          }

          case "idle":
          default: {
            this.doors[agentId].isOpen = false;
            this.drawDoor(agentId, false, "idle");

            agent.container.x = agent.baseX;
            agent.container.y = agent.baseY;
            this.drawCharacter(agentId, "sitting");

            const breatheTween = this.tweens.add({
              targets: agent.container,
              y: { from: agent.baseY - 1.5, to: agent.baseY + 1.5 },
              duration: 1800,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });

            agent.tweens.push(breatheTween);
            break;
          }
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerWidth,
      height: containerHeight,
      backgroundColor: darkMode ? "#0F172A" : "#F8FAFC",
      scene: UltraRealisticOfficeScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    const handleResize = () => {
      if (gameRef.current && containerRef.current) {
        const newWidth = containerRef.current.clientWidth;
        gameRef.current.scale.resize(newWidth, containerHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateTheme(darkMode);
    }
  }, [darkMode]);

  useEffect(() => {
    if (!sceneRef.current || !agentStates) return;

    if (agentStates.agent1) {
      sceneRef.current.applyAgentState("agent1", agentStates.agent1);
    }
    if (agentStates.agent2) {
      sceneRef.current.applyAgentState("agent2", agentStates.agent2);
    }
    if (agentStates.agent3) {
      sceneRef.current.applyAgentState("agent3", agentStates.agent3);
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
        <div className={`p-4 rounded-2xl glass-panel-subtle transition-all duration-300 flex flex-col justify-between space-y-3 ${
          agentStates.agent1 === "working"
            ? "border-amber-500/60 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
            : "hover:border-amber-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-400">
                ROOM 101
              </span>
              <span className="text-xs font-bold text-black dark:text-white font-mono">
                Agent 1 · Thermal Audit
              </span>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full ${
              agentStates.agent1 === "working"
                ? "bg-amber-400 animate-ping"
                : agentStates.agent1 === "done"
                ? "bg-emerald-400"
                : "bg-gray-400 dark:bg-zinc-600"
            }`} />
          </div>

          <div className="text-xs text-gray-600 dark:text-zinc-300 font-mono space-y-1">
            <div className="text-[11px] text-gray-400 dark:text-zinc-500">
              Core: ASHRAE 55 & IECC RAG Vector Store
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-500">Status:</span>
              <span className={`font-bold ${
                agentStates.agent1 === "working"
                  ? "text-amber-400 animate-pulse"
                  : agentStates.agent1 === "done"
                  ? "text-emerald-400"
                  : "text-gray-400 dark:text-zinc-400"
              }`}>
                {agentStates.agent1 === "working" ? "Auditing Standards..." : agentStates.agent1 === "done" ? "Audit Dispatched ✓" : "Standby"}
              </span>
            </div>
          </div>

          {onRunAudit && (
            <button
              onClick={onRunAudit}
              disabled={isAuditLoading}
              className="w-full py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-black shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isAuditLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
              <span>{isAuditLoading ? "Auditing..." : "Trigger Audit (A1)"}</span>
            </button>
          )}
        </div>

        {/* Agent 2 Card */}
        <div className={`p-4 rounded-2xl glass-panel-subtle transition-all duration-300 flex flex-col justify-between space-y-3 ${
          agentStates.agent2 === "working"
            ? "border-cyan-500/60 ring-2 ring-cyan-500/20 bg-cyan-500/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            : "hover:border-cyan-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-400">
                ROOM 102
              </span>
              <span className="text-xs font-bold text-black dark:text-white font-mono">
                Agent 2 · Pre-Cool Shift
              </span>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full ${
              agentStates.agent2 === "working"
                ? "bg-cyan-400 animate-ping"
                : agentStates.agent2 === "done"
                ? "bg-emerald-400"
                : "bg-gray-400 dark:bg-zinc-600"
            }`} />
          </div>

          <div className="text-xs text-gray-600 dark:text-zinc-300 font-mono space-y-1">
            <div className="text-[11px] text-gray-400 dark:text-zinc-500">
              Core: HVAC Chiller Peak Shifter
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-500">Status:</span>
              <span className={`font-bold ${
                agentStates.agent2 === "working"
                  ? "text-cyan-400 animate-pulse"
                  : agentStates.agent2 === "done"
                  ? "text-emerald-400"
                  : "text-gray-400 dark:text-zinc-400"
              }`}>
                {agentStates.agent2 === "working" ? "Shifting Peak Load..." : agentStates.agent2 === "done" ? "Pre-Cool Active ✓" : "Standby"}
              </span>
            </div>
          </div>

          {onRunInfra && (
            <button
              onClick={onRunInfra}
              disabled={isInfraLoading}
              className="w-full py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-black shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isInfraLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>{isInfraLoading ? "Shifting..." : "Trigger Pre-Cool (A2)"}</span>
            </button>
          )}
        </div>

        {/* Agent 3 Card */}
        <div className={`p-4 rounded-2xl glass-panel-subtle transition-all duration-300 flex flex-col justify-between space-y-3 ${
          agentStates.agent3 === "working"
            ? "border-rose-500/60 ring-2 ring-rose-500/20 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
            : "hover:border-rose-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono font-bold text-rose-400">
                ROOM 103
              </span>
              <span className="text-xs font-bold text-black dark:text-white font-mono">
                Agent 3 · Civic Dispatch
              </span>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full ${
              agentStates.agent3 === "working"
                ? "bg-rose-400 animate-ping"
                : agentStates.agent3 === "done"
                ? "bg-emerald-400"
                : "bg-gray-400 dark:bg-zinc-600"
            }`} />
          </div>

          <div className="text-xs text-gray-600 dark:text-zinc-300 font-mono space-y-1">
            <div className="text-[11px] text-gray-400 dark:text-zinc-500">
              Core: Liljegren WBGT Public Health Override
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-500">Status:</span>
              <span className={`font-bold ${
                agentStates.agent3 === "working"
                  ? "text-rose-400 animate-pulse"
                  : agentStates.agent3 === "done"
                  ? "text-emerald-400"
                  : "text-gray-400 dark:text-zinc-400"
              }`}>
                {agentStates.agent3 === "working" ? "Dispatching Alert..." : agentStates.agent3 === "done" ? "Alert Broadcasted ✓" : "Standby"}
              </span>
            </div>
          </div>

          {onRunCivic && (
            <button
              onClick={onRunCivic}
              disabled={isCivicLoading}
              className="w-full py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isCivicLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertOctagon className="w-3.5 h-3.5" />}
              <span>{isCivicLoading ? "Dispatching..." : "Trigger Civic Alert (A3)"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
