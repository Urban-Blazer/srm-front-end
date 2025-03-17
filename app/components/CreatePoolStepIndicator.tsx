import React from "react";

interface StepIndicatorProps {
    step: number;
    setStep: (step: number) => void; // Enables step navigation
}

const steps = [
    { number: 1, label: "Select Token Pair" },
    { number: 2, label: "Set Fees" },
    { number: 3, label: "Set Deposit Amount" },
    { number: 4, label: "Review & Create Pool" },
    { number: 5, label: "Pool Created" }
];

export default function StepIndicator({ step, setStep }: StepIndicatorProps) {
    return (
        <div className="w-64 min-w-[250px] bg-white p-6 rounded-lg shadow-lg">
            <h1 className="text-lg font-bold mb-4">New Position</h1>
            <ul className="space-y-2">
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
