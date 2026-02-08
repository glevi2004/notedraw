'use client';

import { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Send,
  Bot,
  FileCode,
  X,
  ChevronRight,
  Search,
  Loader2
} from 'lucide-react';
import CodeBlock from '@/components/CodeBlock';

interface Task {
  id: string;
  title: string;
  status: 'in-progress' | 'completed' | 'pending';
  time?: string;
  additions?: number;
  deletions?: number;
}

const tasks: Task[] = [
  { id: '1', title: 'Enterprise Order Management System', status: 'in-progress' },
  { id: '2', title: 'Analyze Tab and Agent Usage Patterns', status: 'in-progress' },
  { id: '3', title: 'PyTorch MNIST Experiment', status: 'in-progress' },
  { id: '4', title: 'Fix PR Comment Fetching Issue', status: 'in-progress' },
];

const readyForReview: Task[] = [
  { 
    id: '5', 
    title: 'Set up Cursor Rules for Dashboard', 
    status: 'completed',
    time: '30m',
    additions: 37,
    deletions: 0
  },
  { 
    id: '6', 
    title: 'Bioinformatics Tools', 
    status: 'completed',
    time: '45m',
    additions: 135,
    deletions: 21
  },
];

const pythonCode = `import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets

def get_dataloaders(batch_size=64):
    transform = transforms.Compose([transforms.ToTensor()])
    train = datasets.MNIST(root="data", train=True, download=True, transform=transform)
    test = datasets.MNIST(root="data", train=False, download=True, transform=transform)
    return DataLoader(train, batch_size=batch_size, shuffle=True),
           DataLoader(test, batch_size=batch_size)

class MLP(nn.Module):
    def __init__(self, hidden=128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Flatten(),
            nn.Linear(28*28, hidden),
            nn.ReLU(),
            nn.Linear(hidden, 10),
        )
    
    def forward(self, x):
        return self.net(x)

def train_model(epochs=1, lr=1e-3, device=None):
    device = device or ("cuda" if torch.cuda.is_available() else "cpu")
    model = MLP().to(device)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.CrossEntropyLoss()
    train_loader, _ = get_dataloaders()
    
    # Seed for reproducibility
    torch.manual_seed(42)
    if device == "cuda":
        torch.cuda.manual_seed_all(42)
    
    # AMP + Scheduler
    scaler = torch.cuda.amp.GradScaler(enabled=(device=="cuda"))
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)
    
    model.train()
    for epoch in range(epochs):
        total, correct = 0, 0
        for x, y in tqdm(train_loader, desc=f"epoch {epoch+1}"):
            x, y = x.to(device), y.to(device)
            opt.zero_grad(set_to_none=True)
            logits = model(x)
            loss = loss_fn(logits, y)
            scaler.scale(loss).backward()
            scaler.unscale_(opt)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(opt)
            scaler.update()`;

export default function EditorDemo() {
  const [activeTab, setActiveTab] = useState('train_model.py');
  const [inputValue, setInputValue] = useState('');

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Painting Background Container */}
        <div className="relative rounded-2xl overflow-hidden painting-bg shadow-2xl">
          {/* Editor Window */}
          <div className="relative m-4 md:m-8 bg-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden border border-white/10">
            {/* Window Title Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
              </div>
              <span className="text-xs text-gray-400">Cursor</span>
              <div className="w-16" />
            </div>

            {/* Editor Content */}
            <div className="flex h-[500px] md:h-[600px]">
              {/* Left Sidebar - Task List */}
              <div className="w-64 bg-[#252526] border-r border-white/5 hidden md:flex flex-col">
                <div className="p-3 border-b border-white/5">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <span className="font-medium">In Progress</span>
                    <span className="bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">4</span>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  {tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="px-3 py-2 hover:bg-white/5 cursor-pointer group"
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-300 truncate">{task.title}</p>
                          <span className="text-[10px] text-gray-500">Generating...</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-3 border-t border-white/5 mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <span className="font-medium">Ready for Review</span>
                      <span className="bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">2</span>
                    </div>
                  </div>
                  {readyForReview.map((task) => (
                    <div 
                      key={task.id} 
                      className="px-3 py-2 hover:bg-white/5 cursor-pointer"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-300 truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500">{task.time}</span>
                            <span className="text-[10px] text-green-400">+{task.additions}</span>
                            <span className="text-[10px] text-red-400">-{task.deletions}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Center - Chat Interface */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
                <div className="flex-1 overflow-auto p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-200 mb-3">PyTorch MNIST Experiment</p>
                      <p className="text-sm text-gray-400 mb-4">
                        Add mixed precision training, learning rate scheduling, and proper validation. 
                        Also create an experiment configuration system so I can easily run different hyperparameter settings.
                      </p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Search className="w-3.5 h-3.5" />
                          <span>Searched PyTorch mixed precision training best practices</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <FileCode className="w-3.5 h-3.5" />
                          <span>Reading notebooks/train_model.py (current implementation)</span>
                        </div>
                      </div>

                      <div className="bg-[#252526] rounded-lg p-3 border border-white/5">
                        <p className="text-xs text-gray-400 mb-2">
                          I'll enhance your MNIST trainer with a complete experiment framework including mixed precision training, 
                          validation split, and proper configuration management. Let me rewrite the training module:
                        </p>
                        <div className="flex items-center gap-2 text-xs text-green-400 mb-2">
                          <FileCode className="w-3.5 h-3.5" />
                          <span>train_model.py</span>
                          <span className="text-green-500">+156 -34</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-[#252526] rounded-lg px-3 py-2 border border-white/5">
                    <input
                      type="text"
                      placeholder="Plan, search, build anything..."
                      className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                    />
                    <button className="p-1.5 bg-purple-500/20 rounded-md hover:bg-purple-500/30 transition-colors">
                      <Send className="w-4 h-4 text-purple-400" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2 px-1">
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-400">
                        <Bot className="w-3 h-3" />
                        Agent
                      </button>
                      <span className="text-gray-600">·</span>
                      <button className="text-[10px] text-gray-500 hover:text-gray-400">
                        GPT-5.2
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Code Editor */}
              <div className="w-[400px] lg:w-[500px] bg-[#1e1e1e] border-l border-white/5 hidden sm:flex flex-col">
                {/* File Tabs */}
                <div className="flex items-center bg-[#252526] border-b border-white/5 overflow-x-auto">
                  {['train_model.py', 'run_experiment.py', 'config.yaml'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`
                        px-3 py-2 text-xs flex items-center gap-2 border-r border-white/5 whitespace-nowrap
                        ${activeTab === tab 
                          ? 'bg-[#1e1e1e] text-gray-200' 
                          : 'text-gray-500 hover:text-gray-400 hover:bg-white/5'
                        }
                      `}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      {tab}
                      {activeTab === tab && <X className="w-3 h-3 hover:text-red-400" />}
                    </button>
                  ))}
                </div>

                {/* Code Content */}
                <div className="flex-1 overflow-auto">
                  <CodeBlock 
                    code={pythonCode} 
                    language="python"
                    showLineNumbers={false}
                  />
                </div>
              </div>
            </div>

            {/* Agent Panel Overlay */}
            <div className="absolute bottom-4 right-4 w-80 bg-[#252526] rounded-lg shadow-2xl border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-300">agent</span>
                </div>
              </div>
              <div className="p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 animate-pulse" />
                  <div>
                    <p className="text-xs text-gray-400">Thinking</p>
                    <p className="text-xs text-gray-500">10 seconds</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <div>
                    <p className="text-xs text-gray-400">Searched</p>
                    <p className="text-xs text-gray-500">PyTorch mixed precision training best practices</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-yellow-400 mt-0.5 animate-spin" />
                  <div>
                    <p className="text-xs text-gray-400">Reading</p>
                    <p className="text-xs text-gray-500">notebooks/train_model.py (current implementation)</p>
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>GPT-5.2</span>
                  <span>/ for commands · @ for files</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Caption */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Cursor Agent transforms ideas into code
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            A collaborative AI coding assistant that makes you orders of magnitude more productive.
          </p>
          <a 
            href="#agent" 
            className="inline-flex items-center gap-1 text-sm text-foreground hover:underline mt-3"
          >
            Learn about Agent
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
