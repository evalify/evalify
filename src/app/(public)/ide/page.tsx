import React from 'react'
import UnderDev from '@/components/under-dev'
import CodeEditor from '../../../components/codeEditor/CodeEditor';
type Props = {}

function IDE({ }: Props) {
    return (
        <div>
            {/* <UnderDev featureName='IDE' message='A page where you can access Code Editor and Jupyter Notebook ( with GPUs )' /> */}
            <CodeEditor/>
        </div>
    )
}

export default IDE