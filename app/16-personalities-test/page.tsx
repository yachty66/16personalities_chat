"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  assessment,
  AssessmentQuestion,
  traitDescriptions,
} from "@/app/data/16PersonalitiesTest";

//the scores from https://ipip.ori.org/new_ipip-50-item-scale.html are used

interface Question extends AssessmentQuestion {
  id: number;
}

const questions: Question[] = assessment.map((q, index) => ({
  ...q,
  id: index + 1,
}));

export default function SixteenPersonalities() {
  const supabase = createClientComponentClient();

  // TODO Add this trait order definition
  const traitOrder = [
    { number: "EI", name: "Extraversion vs. Introversion" },
    { number: "SN", name: "Sensing vs. Intuition" },
    { number: "TF", name: "Thinking vs. Feeling" },
    { number: "JP", name: "Judging vs. Perceiving" },
  ];

  // Initialize with empty answers instead of all 5s
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});

  // Start with showResults as false
  const [showResults, setShowResults] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);

  // Initialize with empty scores
  const [scores, setScores] = useState<{ [key: number]: number }>({});

  const questionsPerPage = 5;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(
    currentPage * questionsPerPage,
    (currentPage + 1) * questionsPerPage
  );

  const calculateScores = async () => {
    const typeScores: Record<string, number> = {
      EI: 0,
      SN: 0,
      TF: 0,
      JP: 0,
    };

    questions.forEach((question) => {
      const answer = answers[question.id];
      if (answer !== undefined) {
        const score = question.math === "+" ? answer : 6 - answer;
        typeScores[question.type] += score;
      }
    });

    // Get compatible MBTI types
    const compatibleTypes = getMBTICompatibility(typeScores);

    // Create result object
    const result = {
      scores: typeScores,
      answers: answers,
      compatibleTypes: compatibleTypes,
      timestamp: new Date().toISOString(),
    };

    try {
      // Save to Supabase
      const { data, error } = await supabase
        .from("16_personality_results")
        .insert([{ result }]);

      if (error) {
        console.error("Error saving results:", error);
      } else {
        console.log("Results saved successfully:", data);
      }
    } catch (error) {
      console.error("Error saving results:", error);
    }

    // Update state and scroll to top
    setScores(typeScores);
    setShowResults(true);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    // Track completion in Google Analytics
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "test_completed", {
        event_category: "Engagement",
        event_label: "16 Personality Test",
        compatible_types: compatibleTypes.join(","),
      });
    }
  };

  const calculateRunningScores = () => {
    const runningScores = { "EI": 0, "SN": 0, "TF": 0, "JP": 0};

    questions.forEach((question, index) => {
      const answer = answers[index + 1];
      if (answer !== undefined) {
        // For + keyed items: use value directly (1,2,3,4,5)
        // For - keyed items: reverse the value (5,4,3,2,1)
        const score = question.math === "+" ? answer : 6 - answer;

        runningScores[question.type] += score;
      }
    });

    return runningScores;
  };

  const handleAnswer = (questionId: number, value: number) => {
    //get the value from my data
    const question = questions.find((q) => q.id === questionId);
    //calculate the score
    const score = question?.math === "+" ? value : 6 - value;
    //store the id of the question, value of the user and the score
    const questionPoints = {
      id: questionId,
      value: value,
      score: score,
    };
    //next we need to make the store the value
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: value };
      return newAnswers;
    });

    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: value };

      const currentQuestion = questions.find((q) => q.id === questionId);
      if (currentQuestion) {
        const score = currentQuestion.math === "+" ? value : 6 - value;
        const scores = calculateRunningScores();
      }
      // console.log("newAnswers", newAnswers);
      return newAnswers;
    });
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const isPageComplete = () => {
    return currentQuestions.every((q) => answers[q.id] !== undefined);
  };

  const isLastPage = currentPage === totalPages - 1;

  // Function to determine MBTI compatibility based on aggregated typeScores
    const getMBTICompatibility = (typeScores: Record<string, number>) => {
      // Middle point to differentiate preferences (assumes scores range from 6-30)
      const MIDDLE_SCORE = 18;

      // Determine MBTI preferences based on typeScores
      const preferences = {
        E: typeScores.EI > MIDDLE_SCORE, // Extraversion (E) vs Introversion (I)
        N: typeScores.SN > MIDDLE_SCORE, // Intuition (N) vs Sensing (S)
        F: typeScores.TF > MIDDLE_SCORE, // Feeling (F) vs Thinking (T)
        J: typeScores.JP > MIDDLE_SCORE, // Judging (J) vs Perceiving (P)
      };

      // Construct the user's MBTI type
      const mbtiType =
        (preferences.E ? "E" : "I") +
        (preferences.N ? "N" : "S") +
        (preferences.F ? "F" : "T") +
        (preferences.J ? "J" : "P");

      // All possible MBTI types
      const allTypes = [
        "ENFJ",
        "ENFP",
        "ENTJ",
        "ENTP",
        "ESFJ",
        "ESFP",
        "ESTJ",
        "ESTP",
        "INFJ",
        "INFP",
        "INTJ",
        "INTP",
        "ISFJ",
        "ISFP",
        "ISTJ",
        "ISTP",
      ];

      // Helper function to count matching preferences
      const countMatches = (type: string) => {
        let matches = 0;
        if (type[0] === mbtiType[0]) matches++; // E/I
        if (type[1] === mbtiType[1]) matches++; // N/S
        if (type[2] === mbtiType[2]) matches++; // F/T
        if (type[3] === mbtiType[3]) matches++; // J/P
        return matches;
      };

      // Filter types based on at least 2 matching traits
      const compatibleTypes = allTypes.filter((type) => countMatches(type) >= 2);

      return compatibleTypes;
    };

  const renderResults = () => {
    if (!showResults) return null;

    const MIDDLE_SCORE = 18;
    const getLevel = (score: number) => (score > MIDDLE_SCORE ? "High" : "Low");

    const compatibleTypes = getMBTICompatibility(scores);

    return (
      <div className="bg-muted/50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Your Results</h2>

        <p className="text-muted-foreground mb-8 text-center">
          Your 16 Personalities assessment results are shown below. Each
          trait is scored on a scale from 6 to 30, where 6 represents the
          lowest possible score and 30 represents the highest possible score.
        </p>

        <div className="space-y-8">
          {traitOrder.map(({ number, name }) => (
            <div key={number} className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{name}</h3>
                <span className="text-sm font-medium">
                  Score: {scores[number]} ({getLevel(scores[number])})
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${Math.max(
                      ((scores[number] - 6) / 24) * 100,
                      0
                    )}%`,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {traitDescriptions[number].description}
              </p>
            </div>
          ))}
        </div>

        {/* Compatible Types Section */}
        <div className="mt-12 border-t pt-8">
          <h3 className="text-xl font-semibold text-center mb-4">
            Compatible MBTI Types
          </h3>
          <p className="text-muted-foreground text-center mb-6">
            This MBTI types scored in at least 2 categories in the same way
            (high or low) as you:
          </p>
          <div className="flex flex-col items-center gap-4">
            {compatibleTypes.map((type, index) => (
              <div key={index} className="text-lg font-medium">
                {type}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <span>Chat with similar Types</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-2 h-4 w-4"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Go to MBTI Characters Chat
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-3">16 Personalities Test</h1>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Discover your personality traits through this assessment
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Takes 5 minutes
              </div>
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                </svg>
                No registration required
              </div>
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                100% Free
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {!showResults ? (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <span className="text-sm text-muted-foreground">
                  {questions.length} questions total
                </span>
              </div>

              {currentQuestions.map((question) => (
                <div key={question.id} className="space-y-4">
                  <h3 className="text-base sm:text-lg font-medium text-center max-w-2xl mx-auto px-4">
                    {question.question}
                  </h3>
                  <div className="flex flex-col items-center space-y-4">
                    {/* Scale labels and buttons */}
                    <div className="w-full max-w-md space-y-2">
                      {[
                        { value: 1, label: "Strongly Disagree" },
                        { value: 2, label: "Disagree" },
                        { value: 3, label: "Neutral" },
                        { value: 4, label: "Agree" },
                        { value: 5, label: "Strongly Agree" },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => handleAnswer(question.id, value)}
                          className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors
                            ${
                              answers[question.id] === value
                                ? "bg-primary text-primary-foreground"
                                : "bg-background hover:bg-muted border"
                            }`}
                        >
                          <span className="text-sm sm:text-base">{label}</span>
                          <span className="text-sm sm:text-base font-medium">
                            {value}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center pt-8 px-4">
                <button
                  onClick={handlePrevious}
                  className={`px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-opacity
                    ${
                      currentPage > 0
                        ? "bg-secondary text-secondary-foreground hover:opacity-90"
                        : "invisible"
                    }`}
                >
                  Previous
                </button>

                {isLastPage ? (
                  <button
                    onClick={calculateScores}
                    disabled={!isPageComplete()}
                    className={`bg-primary text-primary-foreground px-6 sm:px-8 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-opacity
                      ${
                        isPageComplete()
                          ? "hover:opacity-90"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                  >
                    See Results
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={!isPageComplete()}
                    className={`bg-primary text-primary-foreground px-6 sm:px-8 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-opacity
                      ${
                        isPageComplete()
                          ? "hover:opacity-90"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          ) : (
            renderResults()
          )}
        </div>
      </main>

      <footer className="border-t">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground text-center">
            Based on the 16 Personalities model.
          </p>
        </div>
      </footer>
    </div>
  );
}
