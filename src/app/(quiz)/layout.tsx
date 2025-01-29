"use client";

import React from "react";

export default function QuizLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="w-full h-[90vh]">
            <div className="">
                {children}
            </div>
        </div>
    );
}
