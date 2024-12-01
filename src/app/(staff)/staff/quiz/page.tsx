import React from 'react'
import UnderDev from '@/components/under-dev'
type Props = {}

function page({ }: Props) {
    return (
        <div>
            <UnderDev featureName="Quiz" message="A page where you will be able to view and take up quiz" />
        </div>
    )
}

export default page