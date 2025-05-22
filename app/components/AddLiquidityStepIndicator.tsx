import React from "react";

interface StepIndicatorProps {
    step: number;
    setStep: (step: number) => void; // Added setStep for navigation
}

const steps = [
    { number: 1, label: "Select Token Pair" },
    { number: 2, label: "Set Deposit Amount" },
    { number: 3, label: "Liquidity Created" }
];

export default function StepIndicator({ step, setStep }: StepIndicatorProps) {
    return (
        <div className="w-64 min-w-[250px] p-6 shadow-lg">
            <h1 className="text-lg font-bold mb-4">New Position</h1>
            <ul className="space-y-2"> {/* Ensures proper spacing without affecting layout */}
                {steps.map((s) => (
                    <li
                        key={s.number}
                        className="flex items-center space-x-3 cursor-pointer"
                        onClick={() => setStep(s.number)}
                    >
                        {/* Step Number Circle */}
                        <div
                            className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-white shrink-0
                                ${step >= s.number ? "bg-deepTeal" : "bg-gray-300"}`}
                        >
                            {s.number}
                        </div>
                        {/* Step Label */}
                        <span
                            className={`text-sm font-medium whitespace-nowrap
                            ${step >= s.number ? "text-deepTeal font-semibold" : "text-gray-500"}`}
                        >
                            {s.label}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
