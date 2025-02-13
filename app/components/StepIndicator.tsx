import React from "react";

interface StepIndicatorProps {
    step: number;
}

const steps = [
    { number: 1, label: "Select Token Pair" },
    { number: 2, label: "Set Fees" },
    { number: 3, label: "Set Deposit Amount" },
];

export default function StepIndicator({ step }: StepIndicatorProps) {
    return (
        <div className="w-1/4 bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-4">New Position</h2>
            <ul>
                {steps.map((s) => (
                    <li key={s.number} className="mb-4 flex items-center">
                        <div
                            className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-white ${step >= s.number ? "bg-black" : "bg-gray-300"
                                }`}
                        >
                            {s.number}
                        </div>
                        <span
                            className={`ml-4 ${step >= s.number ? "text-black font-semibold" : "text-gray-500"
                                }`}
                        >
                            {s.label}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}