import type { AccountProfile, UsernameAvailability } from "../shared/types";

const $ = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`[DOM] Element #${id} not found in DOM.`);
    return document.createElement("div") as unknown as T;
  }
  return element as T;
};

interface AccountFlowOptions {
  onEnter: (profile: AccountProfile, roomId: string) => void;
}

export class AccountFlow {
  private readonly options: AccountFlowOptions;
  private readonly joinScreen = $("join-screen");
  private readonly joinForm = $("join-form") as HTMLFormElement;
  private readonly profileUsernameInput = $("profile-username") as HTMLInputElement;
  private readonly displayNameInput = $("display-name") as HTMLInputElement;
  private readonly roomInput = (document.getElementById("room-input") || document.getElementById("room-id") || document.createElement("input")) as HTMLInputElement;
  private readonly avatarColorInput = $("avatar-color") as HTMLInputElement;
  private readonly usernameStatus = $("username-status");
  private readonly profileSubmit = $("profile-submit") as HTMLButtonElement;
  private readonly soloSubmit = document.getElementById("solo-submit") as HTMLButtonElement | null;
  private readonly joinError = $("join-error");
  private profileUsernameAvailable = false;
  private usernameCheckTimer = 0;
  private usernameCheckRequest = 0;

  constructor(options: AccountFlowOptions) {
    this.options = options;
    const params = new URLSearchParams(location.search);
    this.roomInput.value = params.get("room")?.slice(0, 64) || "imax-auditorium";
    this.joinForm.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.saveProfileAndEnter();
    });
    this.profileUsernameInput.addEventListener("input", () => this.onUsernameInput());

    this.soloSubmit?.addEventListener("click", () => {
      this.joinScreen.classList.add("hidden");
      const guestProfile: AccountProfile = {
        user_id: "guest-user",
        username: this.profileUsernameInput.value.trim() || "guest",
        display_name: this.displayNameInput.value.trim() || "IMAX Guest",
        avatar_color: this.avatarColorInput.value || "#00a2ff",
        profile_complete: true,
        is_development_session: true,
      };
      this.options.onEnter(guestProfile, this.roomInput.value.trim() || "imax-auditorium");
    });
  }

  async initialize() {
    this.profileSubmit.disabled = true;
    try {
      const response = await fetch("/api/account/bootstrap", { credentials: "same-origin" });
      const result = (await response.json()) as AccountProfile | { error?: string };
      if (!response.ok || !("profile_complete" in result)) {
        throw new Error("error" in result && result.error ? result.error : "Could not load your profile.");
      }
      if (result.profile_complete) {
        this.joinScreen.classList.add("hidden");
        this.options.onEnter(result, this.roomInput.value.trim() || "imax-auditorium");
        return;
      }
      this.profileUsernameInput.value = "";
      this.displayNameInput.value = result.display_name === "Guest" ? "" : result.display_name;
      this.avatarColorInput.value = result.avatar_color;
      this.usernameStatus.textContent = "Choose a unique username for this room community.";
      this.profileUsernameInput.focus();
    } catch (error) {
      this.joinError.textContent = error instanceof Error
        ? `${error.message} Click 'Enter IMAX (Solo Mode)' to explore and watch videos immediately.`
        : "Multiplayer server offline. Click 'Enter IMAX (Solo Mode)' below.";
      this.usernameStatus.textContent = "Multiplayer service offline.";
      this.usernameStatus.className = "field-status unavailable";
    }
  }

  private onUsernameInput() {
    window.clearTimeout(this.usernameCheckTimer);
    this.usernameCheckRequest += 1;
    this.profileUsernameAvailable = false;
    this.profileSubmit.disabled = true;
    this.usernameStatus.textContent = "Type a username to check availability.";
    this.usernameStatus.className = "field-status";
    this.usernameCheckTimer = window.setTimeout(() => {
      void this.checkUsernameAvailability();
    }, 350);
  }

  private async checkUsernameAvailability(): Promise<boolean> {
    const username = this.profileUsernameInput.value.trim();
    const requestId = ++this.usernameCheckRequest;
    this.profileUsernameAvailable = false;
    this.profileSubmit.disabled = true;
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      this.usernameStatus.textContent = "Use 3–20 letters, numbers, or underscores.";
      this.usernameStatus.className = "field-status unavailable";
      return false;
    }
    this.usernameStatus.textContent = "Checking availability…";
    this.usernameStatus.className = "field-status checking";
    try {
      const response = await fetch(`/api/account/username-availability?username=${encodeURIComponent(username)}`);
      const result = (await response.json()) as UsernameAvailability;
      if (!response.ok) throw new Error("Username availability could not be checked.");
      if (requestId !== this.usernameCheckRequest) return false;
      this.profileUsernameAvailable = result.valid && result.available;
      this.usernameStatus.textContent = result.message ?? (result.available ? "Username is available." : "Username is not available.");
      this.usernameStatus.className = `field-status ${this.profileUsernameAvailable ? "available" : "unavailable"}`;
      this.profileSubmit.disabled = !this.profileUsernameAvailable;
      return this.profileUsernameAvailable;
    } catch (error) {
      if (requestId !== this.usernameCheckRequest) return false;
      this.usernameStatus.textContent = error instanceof Error ? error.message : "Username availability could not be checked.";
      this.usernameStatus.className = "field-status unavailable";
      this.profileSubmit.disabled = true;
      return false;
    }
  }

  private async saveProfileAndEnter() {
    const roomId = this.roomInput.value.trim().slice(0, 64);
    const displayName = this.displayNameInput.value.trim().slice(0, 32);
    if (!roomId || !displayName) {
      this.joinError.textContent = "Enter a display name and room name.";
      return;
    }
    this.joinError.textContent = "";
    this.profileSubmit.disabled = true;
    if (!(await this.checkUsernameAvailability())) {
      this.joinError.textContent = "Choose an available username before continuing.";
      return;
    }
    this.profileSubmit.disabled = true;
    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: this.profileUsernameInput.value.trim(),
          display_name: displayName,
          avatar_color: this.avatarColorInput.value,
        }),
      });
      const profile = (await response.json()) as AccountProfile | { error?: string };
      if (!response.ok) {
        throw new Error("error" in profile ? profile.error ?? "Could not save your profile." : "Could not save your profile.");
      }
      if (!("profile_complete" in profile) || !profile.profile_complete) {
        throw new Error("The server did not confirm the profile update.");
      }
      this.joinScreen.classList.add("hidden");
      this.options.onEnter(profile, roomId);
    } catch (error) {
      this.joinError.textContent = error instanceof Error ? error.message : "Could not save your profile.";
      this.profileSubmit.disabled = !this.profileUsernameAvailable;
    }
  }
}
