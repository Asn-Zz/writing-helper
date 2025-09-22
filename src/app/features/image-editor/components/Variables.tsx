import { useState, useEffect } from 'react';
import { FaCheckCircle } from 'react-icons/fa';

interface VariableProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
}

const extractVariables = (prompt: string): Record<string, string> => {
    const variableRegex = /{{(.*?)}}/g;
    const variables: Record<string, string> = {};
    let match;
    
    while ((match = variableRegex.exec(prompt)) !== null) {
        const variableName = match[1].trim();
        if (!variables.hasOwnProperty(variableName)) {
            variables[variableName] = '';
        }
    }
    
    return variables;
};

function Variables({ prompt, setPrompt }: VariableProps) {
    const [variables, setVariables] = useState<Record<string, string>>({});
    
    const hasChanges = Object.keys(variables).some(key => variables[key] !== '');

    const replaceVariablesInPrompt = (prompt: string): string => {
        let replacedPrompt = prompt;
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            replacedPrompt = replacedPrompt.replace(regex, variables[key]);
        });
        return replacedPrompt;
    };

    useEffect(() => {        
        const extractedVariables = extractVariables(prompt);
        const target = Object.keys(extractedVariables);

        if (target.length > 0) {
            setVariables(prevVariables => {
                const updatedVariables: Record<string, string> = {...prevVariables};
                target.forEach(key => {
                    updatedVariables[key] = prevVariables[key] || '';
                });                
                return updatedVariables;
            });
        } else {
            setVariables({});
        }
    }, [prompt]);

    return (
        <>
            {Object.keys(variables).length > 0 && (
                <div className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                        变量
                        <span className="flex items-center space-x-2">
                            {hasChanges && <FaCheckCircle className='text-blue-500 cursor-pointer' onClick={() => setPrompt(replaceVariablesInPrompt(prompt))} />}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(variables).map(([key, value]) => (
                            <div key={key} className="grid grid-cols-2 gap-3 text-sm">
                                <input type="text" value={key} readOnly className='p-1 border border-gray-300 rounded' />
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => setVariables(prev => ({
                                        ...prev,
                                        [key]: e.target.value
                                    }))}
                                    placeholder={`请输入变量值`}
                                    className="p-1 border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

export default Variables;