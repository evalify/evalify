import { ArrowRight, CheckCircle2, Zap, Users, Brain, Shield, Clock, LineChart, Book, Award } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
    const features = [
        { title: 'Automated Evaluation', desc: 'Grade assignments and tests with ease', icon: Zap },
        { title: 'Real-time Feedback', desc: 'Instant results and detailed analysis', icon: Clock },
        { title: 'Plagiarism Detection', desc: 'Ensure academic integrity effortlessly', icon: Shield },
        { title: 'Performance Analytics', desc: 'Track progress with detailed insights', icon: LineChart },
        { title: 'Collaborative Learning', desc: 'Enable student group discussions', icon: Users },
        { title: 'AI-Powered Insights', desc: 'Smart learning recommendations', icon: Brain },
        { title: 'Course Management', desc: 'Organize your teaching materials', icon: Book },
        { title: 'Achievement System', desc: 'Gamify the learning experience', icon: Award },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
            <main className="flex-1">
                {/* Hero Section with enhanced animation */}
                <div className="px-6 lg:px-8 pt-24 sm:pt-32">
                    <div className="mx-auto max-w-2xl text-center animate-fade-in">
                        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent animate-gradient">
                            Transform Your Grading Experience
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                            Streamline your evaluation process with our intelligent assessment platform.
                            Save time and provide consistent, fair grading for all your students.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link
                                href="/student"
                                className="rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-indigo-500/25 dark:hover:shadow-indigo-400/25"
                            >
                                Get Started <ArrowRight className="w-4 h-4 animate-bounce-x" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Enhanced Features Grid */}
                <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-24">
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={index}
                                    className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-indigo-200 dark:hover:border-indigo-800 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm group"
                                >
                                    <Icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-4 group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors" />
                                    <h3 className="text-lg font-semibold mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors dark:text-white">{feature.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-300">{feature.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Enhanced Footer */}
            <footer className="mt-32 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        © {new Date().getFullYear()} Evalify. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

