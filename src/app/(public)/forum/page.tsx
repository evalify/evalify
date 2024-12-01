import React from 'react'
import UnderDev from '@/components/under-dev'
type Props = {}

function page({ }: Props) {
    return (
        <div>
            <UnderDev featureName='Forum' message='A page where you will receive notes and class related information' />
        </div>
    )
}

export default page