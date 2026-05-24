import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const colors = {
  bg: "#f4f7f3",
  surface: "#ffffff",
  soft: "#e9f1ec",
  ink: "#111b1d",
  muted: "#667276",
  line: "#d8e2dd",
  deep: "#0c3f3d",
  teal: "#13706a",
  mint: "#94d2bb",
  blue: "#456f9a",
  amber: "#dba85a",
  coral: "#c8675b",
  lavender: "#8580b8"
};

const primaryTabs = [
  { id: "home", label: "Home", icon: "H" },
  { id: "support", label: "Coach", icon: "Co" },
  { id: "checkin", label: "Check", icon: "C" },
  { id: "plan", label: "Plan", icon: "P" },
  { id: "more", label: "More", icon: "M" }
];

const urgeSteps = ["Tell", "Check", "Pause", "Protect"];

const quickUrgeReplies = [
  {
    label: "Chasing losses",
    detail: "Repair urge",
    response:
      "That is the loss-chasing loop talking. For the next 5 minutes, we are not solving money with more risk. Close the app and put one hand flat on the table."
  },
  {
    label: "About to deposit",
    detail: "Money risk",
    response:
      "Good catch before money moved. Leave the deposit screen now. If you can, lock the card or open your protection plan after this pause."
  },
  {
    label: "Just bored",
    detail: "Restless",
    response:
      "Boredom can make risk feel like relief. Let us swap the action: stand up, get water, and stay with me while the first minute passes."
  },
  {
    label: "Feeling stressed",
    detail: "Pressure",
    response:
      "Stress is asking for a fast exit. You do not have to obey it. We will slow the body first, then choose one protective step."
  }
];

const API_BASE_URL =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_BASE_URL
    ? process.env.EXPO_PUBLIC_API_BASE_URL
    : typeof __DEV__ !== "undefined" && __DEV__
      ? "http://127.0.0.1:8788"
      : "https://your-pause-coach-api.example.com";

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function buildLocalCoachReply(text, fallbackReply) {
  const value = String(text || "").toLowerCase();
  const amountMatch = String(text || "").match(/\$\s?[\d,]+(?:\.\d{1,2})?/);
  const urgeMatch = value.match(/\b(10|[1-9])\s*(?:\/\s*10|out of 10)?\b/);
  const details = [];

  if (urgeMatch) details.push(`an urge around ${urgeMatch[1]}/10`);
  if (amountMatch) details.push(`${amountMatch[0].replace(/\s/g, "")} being at risk`);
  if (value.includes("deposit")) details.push("the deposit screen");
  if (value.includes("chasing") || value.includes("loss")) details.push("chasing a loss");
  if (value.includes("alone")) details.push("being alone");
  if (value.includes("stress") || value.includes("stressed") || value.includes("anxious")) details.push("stress");
  if (value.includes("bored")) details.push("boredom");
  if (value.includes("drunk") || value.includes("alcohol") || value.includes("high") || value.includes("substance")) details.push("substance use");

  const detailText = details.length > 1 ? `${details.slice(0, -1).join(", ")} and ${details[details.length - 1]}` : details[0];
  const prefix = detailText
    ? `You named ${detailText}. That is specific enough to act on.`
    : "You named the urge before acting. That is enough to create a pause.";

  if (fallbackReply) {
    return {
      message: detailText ? `${prefix} ${fallbackReply}` : fallbackReply,
      riskLevel: "high",
      intervention: "delay_timer",
      timerSeconds: 300,
      showResources: false
    };
  }

  if (
    value.includes("kill myself") ||
    value.includes("suicid") ||
    value.includes("hurt myself") ||
    value.includes("hurt someone") ||
    value.includes("hurt somebody") ||
    value.includes("hurt others") ||
    value.includes("hurt people") ||
    value.includes("harm someone") ||
    value.includes("harm somebody") ||
    value.includes("harm others") ||
    value.includes("kill someone") ||
    value.includes("kill somebody")
  ) {
    return {
      message:
        "This sounds urgent. Your safety and other people's safety comes first right now. If you might hurt yourself or someone else, call emergency services now. If you are in the US and thinking about self-harm, call or text 988. Stay away from anything you could use to hurt yourself or another person while you contact real-time help.",
      riskLevel: "crisis",
      intervention: "crisis_resources",
      timerSeconds: 0,
      showResources: true
    };
  }

  if (value.includes("odds") || value.includes("picks") || value.includes("parlay") || value.includes("bankroll")) {
    return {
      message:
        "I cannot help with betting advice, picks, odds, predictions, or bankroll strategy. I can help you pause right now. Close the betting screen and tell me: closed or still open?",
      riskLevel: "high",
      intervention: "delay_timer",
      timerSeconds: 300,
      showResources: false
    };
  }

  if (value.includes("deposit") || value.includes("still open")) {
    return {
      message:
        `${prefix} The next step is one protective click: close the deposit or gambling screen now, then answer: closed or still open?`,
      riskLevel: "high",
      intervention: "delay_timer",
      timerSeconds: 300,
      showResources: false
    };
  }

  if (value.includes("chasing") || value.includes("loss")) {
    return {
      message:
        `${prefix} This is the repair urge, not a money plan. For 5 minutes, do not try to fix pain with risk. Put the phone down and play the next hour forward honestly.`,
      riskLevel: "high",
      intervention: "play_forward",
      timerSeconds: 300,
      showResources: false
    };
  }

  if (value.includes("alone")) {
    return {
      message:
        `${prefix} Stay private if you need to, but add friction: move to a shared room, keep this chat open, or draft a simple support text.`,
      riskLevel: "high",
      intervention: "support_contact",
      timerSeconds: 300,
      showResources: false
    };
  }

  return {
    message:
      `${prefix} Stay with me for 60 seconds. Close any gambling screen if it is open, take one slow breath, and tell me whether the urge went up, down, or stayed the same.`,
    riskLevel: "medium",
    intervention: "grounding",
    timerSeconds: 300,
    showResources: false
  };
}

async function requestCoachResponse(message, conversation, fallbackReply) {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/coach/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversation: conversation.slice(-8).map((item) => ({
          role: item.role === "user" ? "user" : "coach",
          text: item.text
        }))
      })
    });

    if (!response.ok) {
      throw new Error("Coach backend unavailable");
    }

    const payload = await response.json();
    if (!payload || typeof payload.message !== "string") {
      throw new Error("Invalid coach response");
    }

    return payload;
  } catch {
    return buildLocalCoachReply(message, fallbackReply);
  }
}

function Screen({ eyebrow, title, lead, children }) {
  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.h1}>{title}</Text>
      {lead ? <Text style={styles.lead}>{lead}</Text> : null}
      <View style={styles.stack}>{children}</View>
    </ScrollView>
  );
}

function Card({ children, soft = false, hero = false }) {
  return <View style={[styles.card, soft && styles.softCard, hero && styles.heroCard]}>{children}</View>;
}

function PrimaryButton({ children, onPress, large = false, tone = "teal" }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        large && styles.primaryLarge,
        tone === "deep" && styles.primaryDeep,
        tone === "coral" && styles.primaryCoral,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.primaryText, large && styles.primaryLargeText]}>{children}</Text>
    </Pressable>
  );
}

function SecondaryButton({ children, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
      <Text style={styles.secondaryText}>{children}</Text>
    </Pressable>
  );
}

function MiniCard({ title, body, onPress }) {
  const content = (
    <View style={[styles.miniCard, onPress && styles.miniCardInPressable]}>
      <Text style={styles.miniTitle}>{title}</Text>
      <Text style={styles.miniBody}>{body}</Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.miniPressable, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

function Option({ label, detail, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.optionDetail}>{detail || ">"}</Text>
    </Pressable>
  );
}

function RowItem({ icon, title, body, action, color = colors.teal }) {
  return (
    <View style={styles.rowItem}>
      <View style={[styles.icon, { backgroundColor: color }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      {action || null}
    </View>
  );
}

function Pill({ children }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

function HomeScreen({ go }) {
  return (
    <Screen
      eyebrow="PAUSE"
      title="Private support before you act."
      lead="A first-line support coach for the moment an urge shows up."
    >
      <PrimaryButton large onPress={() => go("support")}>
        I want to gamble
      </PrimaryButton>

      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.flexCopy}>
            <Text style={styles.h2}>Today's recovery status</Text>
            <Text style={styles.body}>Guardrails active. Last check-in completed this morning.</Text>
          </View>
          <Pill>Private</Pill>
        </View>
      </Card>

      <Card soft>
        <Text style={styles.h2}>Quick check-in</Text>
        <View style={styles.grid}>
          <MiniCard title="Mood" body="Restless but steady." onPress={() => go("checkin")} />
          <MiniCard title="Urge" body="Low right now." onPress={() => go("checkin")} />
        </View>
      </Card>

      <Card>
        <Text style={styles.h2}>Last protective action</Text>
        <View style={styles.list}>
          <RowItem
            icon="P"
            title="Closed a risky app"
            body="Then started a 5 minute delay."
            action={<SecondaryButton onPress={() => go("plan")}>Plan</SecondaryButton>}
          />
        </View>
      </Card>
    </Screen>
  );
}

function AISupportScreen({ go }) {
  const [delaySeconds, setDelaySeconds] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showResourcePrompt, setShowResourcePrompt] = useState(false);
  const [message, setMessage] = useState("Feeling stressed and alone");
  const [chat, setChat] = useState([
    { role: "user", text: "I am close to depositing money." },
    { role: "ai", text: "I am glad you told me before acting. You are not in trouble here. We just need a little distance before the next click." },
    { role: "ai", text: "Quick check: how strong is the urge from 1-10? Are you about to deposit, chasing a loss, alone, or using alcohol or substances?" }
  ]);

  useEffect(() => {
    if (!isRunning) return undefined;
    const id = setInterval(() => {
      setDelaySeconds((current) => {
        if (current <= 1) {
          setIsRunning(false);
          setActiveStep(4);
          return 300;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning]);

  function startPause() {
    setIsRunning((value) => !value);
    setActiveStep(3);
    if (!isRunning && delaySeconds === 300) {
      setChat((items) => [
        ...items,
        { role: "ai", text: "Timer started. Stay with me. First task: close the gambling app or payment screen, then answer: closed or still open?" }
      ]);
    }
  }

  function applyCoachAction(response) {
    if (response.showResources || response.intervention === "crisis_resources") {
      setShowResourcePrompt(true);
      setActiveStep(4);
      return;
    }

    if (response.timerSeconds && response.intervention === "delay_timer") {
      setDelaySeconds(response.timerSeconds);
      setIsRunning(true);
      setActiveStep(3);
      return;
    }

    if (response.intervention === "blocking_prompt" || response.intervention === "support_contact") {
      setActiveStep(4);
    }
  }

  async function sendCoachMessage(text, coachReply) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const pendingId = `coach-${Date.now()}`;
    const userEntry = { role: "user", text: trimmed };
    const nextConversation = [...chat, userEntry];

    setActiveStep((step) => Math.min(step + 1, 4));
    setChat((items) => [
      ...items,
      userEntry,
      {
        role: "ai",
        text: "I am with you. Checking the safest next step...",
        pendingId
      }
    ]);
    setMessage("");

    const coachResponse = await requestCoachResponse(trimmed, nextConversation, coachReply);
    applyCoachAction(coachResponse);
    setChat((items) =>
      items.map((item) =>
        item.pendingId === pendingId
          ? { role: "ai", text: coachResponse.message }
          : item
      )
    );
  }

  return (
    <Screen
      eyebrow="Urge Support"
      title="Stay with me for 60 seconds."
      lead="Tell PAUSE what is happening. Type, speak, or choose a quick response."
    >
      <Card hero>
        <View style={styles.liveHeader}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Private support session active</Text>
        </View>
        <View style={styles.rowBetween}>
          <View style={styles.flexCopy}>
            <Text style={styles.heroEyebrow}>Delay timer</Text>
            <Text style={styles.heroTitle}>Create distance first</Text>
            <Text style={styles.heroBody}>Close the gambling app, then tell me: closed or still open?</Text>
          </View>
          <View style={styles.timer}>
            <Text style={styles.timerText}>{formatTime(delaySeconds)}</Text>
          </View>
        </View>
        <View style={styles.stepRail}>
          {urgeSteps.map((step, index) => (
            <View key={step} style={[styles.stepItem, index < activeStep && styles.stepItemActive]}>
              <Text style={[styles.stepNumber, index < activeStep && styles.stepNumberActive]}>{index + 1}</Text>
              <Text style={[styles.stepLabel, index < activeStep && styles.stepLabelActive]}>{step}</Text>
            </View>
          ))}
        </View>
        <PrimaryButton onPress={startPause}>
          {isRunning ? "Pause timer" : delaySeconds === 300 ? "Start 5 minute pause" : "Resume pause"}
        </PrimaryButton>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.h2}>Private Support Coach</Text>
          <Pill>Coach</Pill>
        </View>
        <View style={styles.chat}>
          {chat.map((item, index) => (
            <View key={`${item.role}-${index}`} style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
              <Text style={[styles.bubbleText, item.role === "user" && styles.userBubbleText]}>{item.text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.composer}>
          <TextInput value={message} onChangeText={setMessage} style={styles.input} placeholder="Tell PAUSE what you feel" />
          <SecondaryButton onPress={() => {}}>Mic</SecondaryButton>
          <SecondaryButton onPress={() => sendCoachMessage(message)}>Send</SecondaryButton>
        </View>
      </Card>

      {showResourcePrompt ? (
        <Card soft>
          <Text style={styles.h2}>Immediate support</Text>
          <Text style={styles.body}>If there is any chance you might hurt yourself or someone else, contact emergency support now. You do not have to handle that moment alone.</Text>
          <View style={styles.buttonSpace}>
            <PrimaryButton tone="coral" onPress={() => go("resources")}>Open crisis resources</PrimaryButton>
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.h2}>One-tap answers</Text>
        <Text style={styles.body}>Choose the closest reason. PAUSE will respond with the next protective move.</Text>
        <View style={styles.optionGrid}>
          {quickUrgeReplies.map((item) => (
            <Option key={item.label} label={item.label} detail={item.detail} onPress={() => sendCoachMessage(item.label, item.response)} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.h2}>Quick risk check</Text>
        <View style={styles.grid}>
          <MiniCard title="Urge strength" body="1-10 right now." onPress={() => sendCoachMessage("My urge is strong right now", "Thank you for naming it. Strong urges rise and fall. Start the timer and give this wave 5 minutes before doing anything with money.")} />
          <MiniCard title="Deposit screen" body="Open or closed?" onPress={() => sendCoachMessage("The deposit screen is open", "Close that screen before we continue. No debate, just one protective click. Then tell me: closed or still open?")} />
          <MiniCard title="Alone right now" body="Yes or no." onPress={() => sendCoachMessage("I am alone right now", "Being alone can make the urge louder. You can stay private and still add support: keep this chat open, move to a shared room, or draft a simple message.")} />
          <MiniCard title="Substances" body="Any alcohol or use?" onPress={() => sendCoachMessage("I have been drinking or using", "That raises risk. Make the decision smaller: no deposits, no gambling apps, and one grounding step before anything else.")} />
        </View>
      </Card>

      <Card soft>
        <Text style={styles.h2}>60-second reset</Text>
        <Text style={styles.body}>Use this while the timer runs. The goal is one safer minute, then the next.</Text>
        <View style={styles.grid}>
          <MiniCard title="Breathe" body="Inhale 4, hold 4, exhale 6." />
          <MiniCard title="Ground" body="Name 5 things you can see." />
          <MiniCard title="Play it forward" body="Picture the next hour honestly." />
          <MiniCard title="Blocking prompt" body="Open protection steps now." onPress={() => go("plan")} />
        </View>
      </Card>
    </Screen>
  );
}

function CheckInScreen() {
  const [urgeLevel, setUrgeLevel] = useState(4);
  return (
    <Screen
      eyebrow="Daily Check-In"
      title="Notice the day without judgment."
      lead="A quick private check-in helps PAUSE understand patterns and risk."
    >
      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.h2}>Urge level</Text>
            <Text style={styles.body}>How strong is the urge today?</Text>
          </View>
          <Text style={styles.meterValue}>{urgeLevel}</Text>
        </View>
        <View style={styles.scaleRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <Pressable
              key={value}
              onPress={() => setUrgeLevel(value)}
              style={[styles.scaleDot, value <= urgeLevel && styles.scaleDotActive]}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.h2}>Daily details</Text>
        <View style={styles.grid}>
          <MiniCard title="Mood" body="Anxious, tired, hopeful." />
          <MiniCard title="Trigger" body="Payday and free evening." />
          <MiniCard title="Gambled today?" body="No. Note risk if needed." />
          <MiniCard title="Intention" body="Delay before any risky action." />
        </View>
      </Card>

      <PrimaryButton>Save check-in</PrimaryButton>
    </Screen>
  );
}

function ProtectionPlanScreen() {
  const [toggles, setToggles] = useState({
    exclusion: true,
    blocking: true,
    bank: false,
    payday: true
  });

  function toggle(key) {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <Screen
      eyebrow="Protection Plan"
      title="Make the next urge harder to act on."
      lead="Use practical blocks and support steps before risk gets loud."
    >
      <Card>
        <Text style={styles.h2}>Protection checklist</Text>
        <View style={styles.list}>
          <RowItem
            icon="1"
            title="Self-exclusion checklist"
            body="Review active exclusions and renew dates."
            action={<Switch value={toggles.exclusion} onValueChange={() => toggle("exclusion")} />}
          />
          <RowItem
            icon="2"
            title="App and site blocking"
            body="Blocking tools enabled on phone and laptop."
            color={colors.blue}
            action={<Switch value={toggles.blocking} onValueChange={() => toggle("blocking")} />}
          />
          <RowItem
            icon="3"
            title="Bank gambling block"
            body="Reminder to confirm card-level block."
            color={colors.amber}
            action={<Switch value={toggles.bank} onValueChange={() => toggle("bank")} />}
          />
          <RowItem
            icon="4"
            title="Payday risk plan"
            body="Move savings first, limit available cash."
            color={colors.coral}
            action={<Switch value={toggles.payday} onValueChange={() => toggle("payday")} />}
          />
          <RowItem
            icon="5"
            title="Support contact"
            body="Optional low-pressure message ready."
            color={colors.lavender}
            action={<SecondaryButton>Draft</SecondaryButton>}
          />
        </View>
      </Card>

      <Card soft>
        <Text style={styles.h2}>Message draft</Text>
        <Text style={styles.body}>I am having a strong urge right now. Can you stay with me for 10 minutes?</Text>
      </Card>
    </Screen>
  );
}

function InsightsScreen({ go }) {
  return (
    <Screen
      eyebrow="Before the Bet"
      title="Get support before the urge peaks."
      lead="Free helps in the moment. Paid helps you prepare for the usual high-risk window."
    >
      <Card hero>
        <Text style={styles.heroEyebrow}>Paid prevention promise</Text>
        <Text style={styles.heroTitle}>PAUSE learns your risk patterns privately.</Text>
        <Text style={styles.heroBody}>Upgrade when you want support windows during usual high-risk times, payday planning, weekly summaries, and more personalized protection.</Text>
        <PrimaryButton onPress={() => go("plans")}>Compare paid plans</PrimaryButton>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.h2}>Money not gambled</Text>
            <Text style={styles.money}>$840</Text>
            <Text style={styles.body}>Estimated protected money this month.</Text>
          </View>
          <View style={styles.bars}>
            {[34, 48, 28, 62, 42].map((height, index) => (
              <View key={height + index} style={[styles.bar, { height }]} />
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.h2}>Common patterns</Text>
        <View style={styles.grid}>
          <MiniCard title="High-risk time" body="Friday, 8-11 PM." />
          <MiniCard title="Trigger" body="Stress plus being alone." />
          <MiniCard title="Urge frequency" body="3 strong urges this week." />
          <MiniCard title="Risk pattern" body="Risk rises after deposits." />
        </View>
      </Card>

      <Card soft>
        <Text style={styles.h2}>What paid unlocks</Text>
        <View style={styles.grid}>
          <MiniCard title="Support window" body="Start a thought check and reframing step during your usual high-risk window." />
          <MiniCard title="Payday alerts" body="Set a money plan before funds become available." />
          <MiniCard title="Weekly summary" body="See what helped, what changed, and what to prepare for." />
          <MiniCard title="Personal playbook" body="Turn repeated triggers into specific prevention steps." />
        </View>
      </Card>
    </Screen>
  );
}

function ResourcesScreen() {
  return (
    <Screen
      eyebrow="Resources"
      title="Help outside the app."
      lead="The support coach is not a therapist or emergency service. Use these when risk is high."
    >
      <Card>
        <Text style={styles.h2}>Immediate support</Text>
        <View style={styles.optionGrid}>
          <Option label="NCPG helpline" detail="Call / text" />
          <Option label="988 crisis support" detail="Immediate danger" />
          <Option label="SAMHSA treatment locator" detail="Find treatment" />
          <Option label="Support groups" detail="Find meetings" />
        </View>
      </Card>

      <Card soft>
        <Text style={styles.h2}>Safety rule</Text>
        <Text style={styles.body}>If you might hurt yourself or someone else, contact emergency support now. You do not have to handle that moment alone.</Text>
      </Card>
    </Screen>
  );
}

function OnboardingScreen({ go }) {
  return (
    <Screen
      eyebrow="Onboarding"
      title="Private support, on your terms."
      lead="PAUSE explains what the support coach can and cannot do before a user starts."
    >
      <Card hero>
        <Text style={styles.heroTitle}>The coach is not here to discuss gambling.</Text>
        <Text style={styles.heroBody}>It is here to help you pause, delay action, reflect, and take one protective step.</Text>
      </Card>

      <Card>
        <Text style={styles.h2}>Setup checklist</Text>
        <View style={styles.list}>
          <RowItem icon="1" title="Privacy preference" body="Choose what gets saved." />
          <RowItem icon="2" title="Protection plan" body="Add blocks, payday plan, and reminders." color={colors.blue} />
          <RowItem icon="3" title="Optional contact" body="Add a trusted person only if you want." color={colors.amber} />
        </View>
      </Card>

      <PrimaryButton onPress={() => go("home")}>Start privately</PrimaryButton>
    </Screen>
  );
}

function PlansScreen() {
  return (
    <Screen
      eyebrow="Plans"
      title="Free helps you pause. Paid helps you see it coming."
      lead="Emergency support stays free. Subscriptions add personalization, preparation, and prevention."
    >
      <Card hero>
        <Text style={styles.heroEyebrow}>The paid promise</Text>
        <Text style={styles.heroTitle}>PAUSE becomes your private prevention system.</Text>
        <Text style={styles.heroBody}>The free app helps during an urge. Paid plans help spot patterns earlier, prepare for risky moments, and keep you accountable over time.</Text>
      </Card>

      <Card>
        <Text style={styles.h2}>Free</Text>
        <Text style={styles.price}>$0</Text>
        <Text style={styles.body}>For immediate help: I want to gamble flow, basic support coach, delay timer, daily check-in, protection plan, and crisis resources.</Text>
        <Text style={styles.planPromise}>Always includes urgent support.</Text>
      </Card>
      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.h2}>Weekly</Text>
            <Text style={styles.price}>$4.99/week</Text>
          </View>
          <Pill>Short-term</Pill>
        </View>
        <Text style={styles.body}>For a high-risk week: unlimited coach conversations, voice input, trigger tracking, and payday reminders.</Text>
        <Text style={styles.planPromise}>Best when you need support right now.</Text>
      </Card>
      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.h2}>Monthly</Text>
            <Text style={styles.price}>$14.99/month</Text>
          </View>
          <Pill>Popular</Pill>
        </View>
        <Text style={styles.body}>For ongoing prevention: Before the Bet insights, weekly summaries, personalized coping plans, and data export.</Text>
        <Text style={styles.planPromise}>Best for seeing patterns before they repeat.</Text>
      </Card>
      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.h2}>Yearly</Text>
            <Text style={styles.price}>$99/year</Text>
          </View>
          <Pill>Best value</Pill>
        </View>
        <Text style={styles.body}>For long-term recovery: deeper pattern history, advanced financial tools, expanded education, and care planning.</Text>
        <Text style={styles.planPromise}>Best for building a full prevention system.</Text>
      </Card>
    </Screen>
  );
}

function SettingsScreen({ go }) {
  return (
    <Screen
      eyebrow="Settings"
      title="Privacy-first by default."
      lead="Control data, notifications, emergency preferences, and coach safety behavior."
    >
      <Card>
        <View style={styles.list}>
          <RowItem icon="P" title="Privacy controls" body="Encrypted sensitive data and private coach history." action={<Switch value />} />
          <RowItem icon="D" title="Data export/delete" body="Download or delete your records." color={colors.blue} action={<SecondaryButton>Manage</SecondaryButton>} />
          <RowItem icon="N" title="Notifications" body="Encouragement and accountability prompts." color={colors.amber} action={<Switch value />} />
          <RowItem icon="E" title="Emergency contact" body="Optional, never forced." color={colors.coral} action={<SecondaryButton>Set</SecondaryButton>} />
        </View>
      </Card>

      <Card soft>
        <Text style={styles.h2}>Coach safety rules</Text>
        <Text style={styles.body}>PAUSE never gives betting advice, picks, predictions, bankroll strategy, or tips for smaller bets. It helps create distance between urge and action.</Text>
      </Card>

      <Card>
        <Text style={styles.h2}>Architecture model</Text>
        <View style={styles.grid}>
          <MiniCard title="React Native MVP" body="Mobile-first app shell." />
          <MiniCard title="Secure backend" body="Encrypted sensitive data." />
          <MiniCard title="Coach engine" body="Structured responses trigger timers and checklists." />
          <MiniCard title="Safety checks" body="Review support messages before and after replies." />
        </View>
      </Card>

      <PrimaryButton onPress={() => go("plans")}>View plans</PrimaryButton>
    </Screen>
  );
}

function MoreScreen({ go }) {
  return (
    <Screen
      eyebrow="More"
      title="Deeper tools, when you need them."
      lead="The free app helps you pause today. Paid plans help you prepare for tomorrow."
    >
      <Card hero>
        <Text style={styles.heroEyebrow}>Why upgrade?</Text>
        <Text style={styles.heroTitle}>Practice the next helpful thought before the urge gets loud.</Text>
        <Text style={styles.heroBody}>Paid PAUSE turns check-ins into helpful prompts, payday reminders, weekly summaries, and a personal prevention playbook.</Text>
        <PrimaryButton onPress={() => go("plans")}>See free vs paid</PrimaryButton>
      </Card>

      <Card>
        <Text style={styles.h2}>MVP screens</Text>
        <View style={styles.optionGrid}>
          <Option label="Before the Bet" onPress={() => go("insights")} />
          <Option label="Resources" onPress={() => go("resources")} />
          <Option label="Settings" onPress={() => go("settings")} />
          <Option label="Plans" onPress={() => go("plans")} />
          <Option label="Onboarding" onPress={() => go("onboarding")} />
        </View>
      </Card>

      <Card soft>
        <Text style={styles.h2}>Product principle</Text>
        <Text style={styles.body}>The coach is not here to discuss gambling. It is here to create distance between urge and action.</Text>
      </Card>
    </Screen>
  );
}

function AppShell() {
  const [screen, setScreen] = useState("home");

  const activeTab = useMemo(() => (primaryTabs.some((tab) => tab.id === screen) ? screen : "more"), [screen]);

  function renderScreen() {
    switch (screen) {
      case "onboarding":
        return <OnboardingScreen go={setScreen} />;
      case "support":
        return <AISupportScreen go={setScreen} />;
      case "checkin":
        return <CheckInScreen />;
      case "plan":
        return <ProtectionPlanScreen />;
      case "insights":
        return <InsightsScreen go={setScreen} />;
      case "resources":
        return <ResourcesScreen />;
      case "settings":
        return <SettingsScreen go={setScreen} />;
      case "plans":
        return <PlansScreen />;
      case "more":
        return <MoreScreen go={setScreen} />;
      case "home":
      default:
        return <HomeScreen go={setScreen} />;
    }
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar barStyle="dark-content" />
      {renderScreen()}
      <View style={styles.tabbar}>
        {primaryTabs.map((tab) => (
          <Pressable key={tab.id} onPress={() => setScreen(tab.id)} style={[styles.tab, activeTab === tab.id && styles.activeTab]}>
            <Text style={[styles.tabIcon, activeTab === tab.id && styles.activeTabText]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.bg
  },
  screen: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 110
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12
  },
  h1: {
    color: colors.ink,
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 34
  },
  h2: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23
  },
  lead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  stack: {
    gap: 14,
    marginTop: 22
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    ...Platform.select({
      web: {
        boxShadow: "0 10px 18px rgba(12, 63, 61, 0.12)"
      },
      default: {
        shadowColor: colors.deep,
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 4
      }
    })
  },
  softCard: {
    backgroundColor: colors.soft,
    ...Platform.select({
      web: {
        boxShadow: "none"
      },
      default: {
        shadowOpacity: 0,
        elevation: 0
      }
    })
  },
  heroCard: {
    backgroundColor: colors.deep,
    borderWidth: 0
  },
  heroEyebrow: {
    color: colors.mint,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25
  },
  heroBody: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8
  },
  primary: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal,
    borderRadius: 17,
    paddingHorizontal: 18
  },
  primaryDeep: {
    backgroundColor: colors.deep
  },
  primaryCoral: {
    backgroundColor: colors.coral
  },
  primaryLarge: {
    minHeight: 96,
    borderRadius: 24
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center"
  },
  primaryLargeText: {
    fontSize: 21
  },
  secondary: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
    borderRadius: 999,
    paddingHorizontal: 14
  },
  secondaryText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "900"
  },
  pressed: {
    opacity: 0.72
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  flexCopy: {
    flex: 1
  },
  pill: {
    alignItems: "center",
    backgroundColor: colors.soft,
    borderRadius: 999,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 13
  },
  pillText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "900"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },
  miniCard: {
    backgroundColor: "#fbfdfc",
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 88,
    padding: 12,
    width: "48%"
  },
  miniPressable: {
    width: "48%"
  },
  miniCardInPressable: {
    width: "100%"
  },
  miniTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6
  },
  miniBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16
  },
  list: {
    gap: 12,
    marginTop: 14
  },
  rowItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 46
  },
  rowCopy: {
    flex: 1
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  rowBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4
  },
  icon: {
    alignItems: "center",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  iconText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  },
  liveHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 14
  },
  liveDot: {
    backgroundColor: colors.mint,
    borderRadius: 999,
    height: 10,
    width: 10
  },
  liveText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "900"
  },
  stepRail: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    marginTop: 16
  },
  stepItem: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    flex: 1,
    minHeight: 54,
    justifyContent: "center",
    paddingVertical: 8
  },
  stepItemActive: {
    backgroundColor: "rgba(148,210,187,0.24)"
  },
  stepNumber: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "900"
  },
  stepNumberActive: {
    color: colors.mint
  },
  stepLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3
  },
  stepLabelActive: {
    color: "#ffffff"
  },
  timer: {
    alignItems: "center",
    backgroundColor: colors.soft,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    height: 94,
    justifyContent: "center",
    width: 94
  },
  timerText: {
    color: colors.deep,
    fontSize: 27,
    fontWeight: "900"
  },
  chat: {
    gap: 10,
    marginTop: 14
  },
  bubble: {
    borderRadius: 18,
    maxWidth: "88%",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.soft,
    borderBottomLeftRadius: 6
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.teal,
    borderBottomRightRadius: 6
  },
  bubbleText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18
  },
  userBubbleText: {
    color: "#ffffff"
  },
  composer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 14
  },
  buttonSpace: {
    marginTop: 14
  },
  input: {
    backgroundColor: "#fbfdfc",
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    height: 42,
    paddingHorizontal: 14
  },
  optionGrid: {
    gap: 10,
    marginTop: 14
  },
  option: {
    alignItems: "center",
    backgroundColor: "#fbfdfc",
    borderColor: colors.line,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 14
  },
  optionLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  optionDetail: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  meterValue: {
    color: colors.coral,
    fontSize: 48,
    fontWeight: "900"
  },
  scaleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18
  },
  scaleDot: {
    backgroundColor: colors.line,
    borderRadius: 999,
    height: 18,
    flex: 1
  },
  scaleDotActive: {
    backgroundColor: colors.coral
  },
  money: {
    color: colors.teal,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 10
  },
  bars: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 7,
    height: 66
  },
  bar: {
    backgroundColor: colors.mint,
    borderRadius: 999,
    width: 10
  },
  price: {
    color: colors.teal,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8
  },
  planPromise: {
    color: colors.deep,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 12
  },
  tabbar: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: colors.line,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    height: 86,
    left: 0,
    paddingBottom: 18,
    paddingHorizontal: 10,
    paddingTop: 10,
    position: "absolute",
    right: 0
  },
  tab: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    justifyContent: "center"
  },
  activeTab: {
    backgroundColor: colors.soft
  },
  tabIcon: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2
  },
  activeTabText: {
    color: colors.teal
  }
});
