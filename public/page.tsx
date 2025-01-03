"use client";

import Image from "next/image";
import Link from "next/link";
import { RefreshCcw, Settings, Send, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, FormEvent, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectSeparator,
  SelectGroup,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface Message {
  text: string;
  isUser: boolean;
}

interface Character {
  name: string;
  occupation: string;
  avatar: string;
}

interface CharacterGroups {
  [key: string]: {
    title: string;
    characters: { [key: string]: Character };
  };
}

export default function MessagingInterface() {
  // First define the character groups
  const characterGroups = {
    analysts: {
      title: "Analysts (NT)",
      characters: {
        intj_male: { name: "Marcus" },
        intj_female: { name: "Diana" },
        intp_male: { name: "Alex" },
        intp_female: { name: "Faith" },
        entj_male: { name: "James" },
        entj_female: { name: "Victoria" },
        entp_male: { name: "Max" },
        entp_female: { name: "Sophia" },
      },
    },
    diplomats: {
      title: "Diplomats (NF)",
      characters: {
        infj_male: { name: "Ethan", occupation: "Counseling Psychologist" },
        infj_female: { name: "Luna", occupation: "Non-profit Director" },
        infp_male: {
          name: "Oliver",
          occupation: "Writer & Creative Writing Teacher",
        },
        infp_female: { name: "Maya", occupation: "Art Therapist" },
        enfj_male: { name: "Nathan", occupation: "Executive Leadership Coach" },
        enfj_female: {
          name: "Elena",
          occupation: "Education Program Director",
        },
        enfp_male: { name: "Leo", occupation: "Creative Director" },
        enfp_female: { name: "Nina", occupation: "Innovation Consultant" },
      },
    },
    sentinels: {
      title: "Sentinels (SJ)",
      characters: {
        istj_male: { name: "Thomas", occupation: "Financial Analyst" },
        istj_female: { name: "Sarah", occupation: "Project Manager" },
        isfj_male: { name: "David", occupation: "Pediatric Nurse" },
        isfj_female: { name: "Emma", occupation: "Elementary School Teacher" },
        estj_male: { name: "Michael", occupation: "Operations Director" },
        estj_female: { name: "Rachel", occupation: "Corporate Attorney" },
        esfj_male: { name: "Daniel", occupation: "HR Manager" },
        esfj_female: { name: "Sophie", occupation: "Event Coordinator" },
      },
    },
    explorers: {
      title: "Explorers (SP)",
      characters: {
        istp_male: { name: "Ryan", occupation: "Mechanical Engineer" },
        istp_female: { name: "Alex", occupation: "Detective" },
        isfp_male: { name: "Kai", occupation: "Freelance Photographer" },
        isfp_female: { name: "Mia", occupation: "Interior Designer" },
        estp_male: { name: "Jake", occupation: "Sales Director" },
        estp_female: { name: "Morgan", occupation: "Emergency Room Physician" },
        esfp_male: { name: "Marco", occupation: "Professional Chef" },
        esfp_female: {
          name: "Lily",
          occupation: "Performance Artist & Dance Instructor",
        },
      },
    },
  };

  // Then define the helper function
  const getRandomCharacter = () => {
    const allCharacters = Object.values(characterGroups).flatMap((group) =>
      Object.keys(group.characters)
    );
    const randomIndex = Math.floor(Math.random() * allCharacters.length);
    return allCharacters[randomIndex];
  };

  // Then use it in useState
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedCharacter, setSelectedCharacter] =
    useState<string>("intp_female");
  const [showCopied, setShowCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const supabase = createClientComponentClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      // If user just signed in, restore messages and input
      if (user) {
        const pendingMessages = localStorage.getItem("pendingMessages");
        const pendingInput = localStorage.getItem("pendingInput");

        if (pendingMessages) {
          setMessages(JSON.parse(pendingMessages));
          localStorage.removeItem("pendingMessages");
        }

        if (pendingInput) {
          setInputValue(pendingInput);
          localStorage.removeItem("pendingInput");
        }
      }
    };
    getUser();
  }, []);

  // Update with random character after mount
  useEffect(() => {
    setSelectedCharacter(getRandomCharacter());
  }, []);

  // Helper function to get character group
  const getCharacterGroup = (charKey: string) => {
    const type = charKey.substring(0, 4); // Get XXXX from XXXX_gender
    switch (type) {
      case "intj":
      case "intp":
      case "entj":
      case "entp":
        return "analysts";
      case "infj":
      case "infp":
      case "enfj":
      case "enfp":
        return "diplomats";
      case "istj":
      case "isfj":
      case "estj":
      case "esfj":
        return "sentinels";
      case "istp":
      case "isfp":
      case "estp":
      case "esfp":
        return "explorers";
      default:
        return "analysts";
    }
  };

  // Get current character
  const getCurrentCharacter = (charKey: string) => {
    const group = getCharacterGroup(charKey);
    return characterGroups[group].characters[charKey];
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      // Check if user has reached the message limit
      if (messages.length >= 4 && !user) {
        setShowSettings(true);
        return;
      }

      const userMessage = { text: inputValue, isUser: true };
      setMessages((prev) => [...prev, userMessage]);

      const requestBody = {
        messages: [...messages, userMessage],
        selectedCharacter: selectedCharacter,
      };

      try {
        const response = await fetch("/api/py/message_response", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setMessages((prev) => [...prev, { text: data.message, isUser: false }]);
      } catch (error) {
        console.error("Error:", error);
      }

      setInputValue("");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Chat with MBTI Characters",
          text: "Check out this interesting chat with MBTI personalities!",
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback to copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch (error) {
        console.error("Error copying to clipboard:", error);
      }
    }
  };

  const handleGoogleSignIn = () => {
    // Store current messages and input value in localStorage
    localStorage.setItem("pendingMessages", JSON.stringify(messages));
    localStorage.setItem("pendingInput", inputValue);

    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  return (
    <div className="flex justify-center bg-background min-h-screen">
      <div className="flex flex-col w-full max-w-3xl">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedCharacter(getRandomCharacter());
              setMessages([]); // Clear all messages
            }}
          >
            <RefreshCcw className="h-5 w-5 text-muted-foreground" />
          </Button>

          <div className="flex items-center gap-4">
            <Select
              value={selectedCharacter}
              onValueChange={setSelectedCharacter}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue>
                  {selectedCharacter && (
                    <span>
                      {
                        characterGroups[getCharacterGroup(selectedCharacter)]
                          .characters[selectedCharacter].name
                      }{" "}
                      ({selectedCharacter.toUpperCase()})
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(characterGroups).map(([groupKey, group]) => (
                  <SelectGroup key={groupKey}>
                    <SelectLabel>{group.title}</SelectLabel>
                    {Object.entries(group.characters).map(([charKey, char]) => (
                      <SelectItem key={charKey} value={charKey}>
                        {char.avatar ? (
                          <Image
                            src={char.avatar}
                            alt={char.name}
                            width={20}
                            height={20}
                            className="inline-block mr-2 rounded-full"
                          />
                        ) : (
                          <span
                            className="inline-block mr-2 rounded-full bg-gray-200"
                            style={{ width: 20, height: 20 }}
                          ></span>
                        )}
                        {char.name} ({charKey.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {getCurrentCharacter(selectedCharacter).avatar ? (
              <Image
                src={getCurrentCharacter(selectedCharacter).avatar}
                alt={getCurrentCharacter(selectedCharacter).name}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="relative"
            >
              <span className="sr-only">Share</span>
              {showCopied ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Share2 className="h-5 w-5 text-muted-foreground" />
              )}
              {showCopied && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-popover px-2 py-1 rounded shadow-sm whitespace-nowrap">
                  Copied to clipboard!
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-muted-foreground p-4">
              <div className="max-w-md space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  Chat with {getCurrentCharacter(selectedCharacter).name}
                </h2>
                <p>
                  Start a conversation with your MBTI personality match. Just
                  type your message below and press enter.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCharacter(getRandomCharacter())}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Try another personality
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 mb-4 ${
                  message.isUser ? "ml-auto flex-row-reverse" : ""
                } max-w-[85%]`}
              >
                <Image
                  src={
                    message.isUser && user?.user_metadata?.avatar_url
                      ? user.user_metadata.avatar_url
                      : "/placeholder.svg"
                  }
                  alt={message.isUser ? "User" : "AI"}
                  width={32}
                  height={32}
                  className="rounded-full mt-1"
                />
                <div
                  className={`p-3 rounded-lg ${
                    message.isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))
          )}
        </main>

        {/* Footer */}
        <footer className="border-t">
          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type your message..."
                className="bg-muted h-12 text-base"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Button
                type="submit"
                size="icon"
                className="h-12 w-12"
                onClick={(e) => {
                  if (messages.length >= 4 && !user) {
                    e.preventDefault();
                    setShowSettings(true);
                    return;
                  }
                }}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </footer>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {user ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Image
                    src={user?.user_metadata?.avatar_url || "/placeholder.svg"}
                    alt={user?.user_metadata?.full_name || "Profile"}
                    width={40}
                    height={40}
                    className="rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                  <div>
                    <p className="font-medium">
                      {user.user_metadata?.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setUser(null);
                    setShowSettings(false);
                    window.location.reload(); // Force reload to clear all states
                  }}
                  variant="outline"
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2"
              >
                <Image
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  width={20}
                  height={20}
                />
                Sign in with Google
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
