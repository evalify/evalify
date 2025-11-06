"use client";

import React from "react";
import { CourseManagement } from "@/components/admin/courses/course-management";

type Props = {
    params: Promise<{
        semesterId: string;
    }>;
};

export default function Page(props: Props) {
    const params = React.use(props.params);
    const { semesterId } = params;

    return (
        <div className="p-6">
            <CourseManagement semesterId={parseInt(semesterId)} />
        </div>
    );
}
