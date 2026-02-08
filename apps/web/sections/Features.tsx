'use client';

import { ChevronRight, Zap, Sparkles } from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

const tabCode = `"use client";
import React, { useState } from "react";
import Navigation from "./Navigation";
import SupportChat from "./SupportChat";

export default function Dashboard() {
  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      <div className="w-64 border-r">
        <Navigation />
      </div>
      <div className="flex-1 p-6">
        <DashboardContent />
      </div>
      <div className="w-80 border-l">
        <SupportChat />
      </div>
    </div>
  );
}`;

export default function Features() {

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8" id="features">
      <div className="max-w-7xl mx-auto space-y-24">
        
        {/* Tab Feature */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-muted-foreground">Tab</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
              Magically accurate autocomplete
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Our custom Tab model predicts your next move with incredible speed and precision.
            </p>
            <a 
              href="#tab" 
              className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              Learn about Tab
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Tab Demo */}
          <div className="relative rounded-xl overflow-hidden painting-bg shadow-xl">
            <div className="relative m-4 bg-[#1e1e1e] rounded-lg shadow-lg overflow-hidden border border-white/10">
              {/* Window Header */}
              <div className="flex items-center px-3 py-2 bg-[#252526] border-b border-white/5">
                <div className="flex gap-1.5 mr-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                </div>
                <span className="text-[10px] text-gray-500">Dashboard.tsx</span>
              </div>
              
              {/* Code with ghost text effect */}
              <div className="p-4 relative">
                <CodeBlock code={tabCode} language="tsx" showLineNumbers={false} />
                
                {/* Ghost text suggestion */}
                <div className="absolute bottom-4 left-[180px] flex items-center">
                  <span className="text-gray-500 text-xs">&lt;Navigation /&gt;</span>
                  <span className="text-gray-600 text-xs animate-pulse">_</span>
                </div>
              </div>

              {/* Tab indicator */}
              <div className="absolute bottom-4 right-4 bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-[10px] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Press Tab to accept
              </div>
            </div>
          </div>
        </div>

        {/* Software Everywhere Feature */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
            Software development, everywhere
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cursor reviews your PRs in GitHub, acts as a teammate in Slack, and works anywhere you do.
          </p>
          <a 
            href="#ecosystem" 
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline mt-4"
          >
            Learn about Cursor's ecosystem
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* Slack & GitHub Integration Demo */}
        <div className="relative rounded-2xl overflow-hidden painting-bg shadow-2xl">
          <div className="grid md:grid-cols-2 gap-4 p-6 md:p-8">
            {/* Slack Panel */}
            <div className="bg-white dark:bg-[#1a1d21] rounded-lg shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#611f69] text-white">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                  <span className="font-medium text-sm">#ask-cursor</span>
                  <span className="text-xs opacity-75">8 members</span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-medium">D</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">dylan</span>
                      <span className="text-xs text-gray-500">Sep 16, 2025</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      Small feature suggestion, but it would be super useful if the release page on the website had anchor links
                    </p>
                    <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 inline-block">4 replies</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center text-white text-xs font-medium">E</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">eric</span>
                      <span className="text-xs text-gray-500">Sep 16, 2025</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      checks out <span className="text-blue-600 dark:text-blue-400">@cursor</span> can you take a stab?
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-purple-600">Cursor</span>
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 px-1.5 py-0.5 rounded">APP</span>
                      <span className="text-xs text-gray-500">Sep 16, 2025</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      I've implemented direct linking functionality for changelog entries and updated the Node.js version constraints across the entire project for better compatibility and maintainability.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* GitHub Panel */}
            <div className="bg-white dark:bg-[#0d1117] rounded-lg shadow-lg overflow-hidden border dark:border-gray-800">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#161b22] border-b dark:border-gray-800">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="font-medium text-sm">GitHub Pull Request</span>
              </div>
              <div className="p-4">
                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">cursor</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">bot</span>
                        <span className="text-xs text-gray-500">reviewed 1 minute ago</span>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-[#161b22] rounded p-3 text-sm font-mono text-xs">
                        <div className="text-gray-500 mb-1">src/vs/workbench/composer/browser/components/ComposerUnifiedDropdown.tsx</div>
                        <div className="space-y-1">
                          <div className="flex">
                            <span className="text-gray-500 w-12 text-right mr-4">3292</span>
                            <span className="text-red-500">- {'{selectedMode().keybinding}'}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-500 w-12 text-right mr-4">3293</span>
                            <span className="text-green-500">+ {'{composerOpenModeToggleKeybinding}'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <p className="text-sm font-medium text-red-800 dark:text-red-400 mb-1">
                          Bug: Function returns object instead of string (logic error)
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300">
                          composerOpenModeToggleKeybinding is a function that needs to be called to get its value. Using it directly causes the keybinding display condition to always be true.
                        </p>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700">
                          <Sparkles className="w-3 h-3" />
                          Fix in Cursor
                        </button>
                        <button className="px-3 py-1.5 border dark:border-gray-700 text-xs rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                          Fix on Web
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
