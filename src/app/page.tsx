"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: session } = authClient.useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);

  const onSubmit = () => {
    if (isSignUp) {
      authClient.signUp.email(
        {
          email,
          name,
          password,
        },
        {
          onError: (err) => {
            window.alert("Sign up failed: " + err.error.message);
          },
          onSuccess: () => {
            window.alert("Sign up successful!");
          },
        }
      );
    } else {
      authClient.signIn.email(
        {
          email,
          password,
        },
        {
          onError: (err) => {
            window.alert("Login failed: Incorrect email or password");
          },
          onSuccess: () => {
            window.alert("Login successful!");
          },
        }
      );
    }
  };

  if (session) {
    return (
      <div className="p-4 flex flex-col gap-y-4">
        <p>Logged in as {session.user.name}</p>
        <p>Email: {session.user.email}</p>
        <Button onClick={() => authClient.signOut()}>Sign out</Button>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-y-4">
      <h2 className="text-2xl font-bold">
        {isSignUp ? "Sign Up" : "Sign In"}
      </h2>

      {isSignUp && (
        <Input
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <Input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button onClick={onSubmit}>
        {isSignUp ? "Create user" : "Sign in"}
      </Button>

      <p className="text-sm">
        {isSignUp ? "Already have an account? " : "Don't have an account? "}
        <button
          className="text-blue-500 underline"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}