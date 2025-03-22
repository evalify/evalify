import Link from 'next/link';
import React from 'react'
import { ThemeToggler } from './theme-toggle';
import { Button } from './ui/button';
import { Bell } from 'lucide-react';
import { UserNav } from './user-nav';
import { auth } from '@/lib/auth/auth';

const HeaderNavbar = async () => {
    const session = await auth();

    return (
        <header className="fixed top-0 left-0 right-0 h-14 border-b z-30 bg-background/95 supports-[backdrop-filter]:bg-background/60">
            <div className='flex items-center justify-between h-full px-4'>
                <Link href='/' className='flex items-center gap-2'>
                    <p className='rounded-lg border-2 border-b-4 border-r-4 border-black px-2 py-1 text-x1 font-bold transition-all hover:-translate-y-[2px] md:block dark:border-white'>
                        Evalify
                    </p>
                </Link>

                <div className="flex items-center">
                    {

                        session?.user?.role !== "STUDENT" && (
                            <>
                                <Button variant="ghost"  className="mr-2" disabled>
                                    {session?.user?.role}
                                </Button>
                            </>
                        )
                    }
                    <ThemeToggler />
                    {
                        session?.user && (
                            <>
                                <Button variant="ghost" size="icon" className="mr-2">
                                    <Bell className="h-5 w-5" />
                                    <span className="sr-only">Notifications</span>
                                </Button>
                                <UserNav />
                            </>
                        )
                    }
                </div>
            </div>
        </header>
    );
}
export default HeaderNavbar;

