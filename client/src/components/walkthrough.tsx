import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Step = {
  title: string;
  description: string;
  element?: string;
};

const steps: Step[] = [
  {
    title: "Welkom bij MEFEN",
    description: "We leiden je graag rond in onze applicatie. Klik op 'Volgende' om te beginnen.",
  },
  {
    title: "Dashboard",
    description: "Dit is je startpunt. Hier vind je een overzicht van alle belangrijke informatie.",
    element: "[href='/']"
  },
  {
    title: "Planning",
    description: "Bekijk en beheer hier alle activiteiten en evenementen.",
    element: "[href='/planning']"
  },
  {
    title: "Vrijwilligers",
    description: "Hier vind je een overzicht van alle vrijwilligers en kun je taken toewijzen.",
    element: "[href='/volunteers']"
  },
  {
    title: "Communicatie",
    description: "Hier vind je de communicatiekanalen per ruimte.",
    element: "[href='/communication']"
  },
  {
    title: "Materialen",
    description: "Beheer hier alle materialen en zie wie wat in gebruik heeft.",
    element: "[href='/materials']"
  },
  {
    title: "Import/Export",
    description: "Hier kun je nieuwe aanmeldingen beheren en de huidige vrijwilligerslijst exporteren.",
    element: "[href='/import-export']"
  },
  {
    title: "Mijn Moskee",
    description: "Hier vind je alle nodige informatie over de moskee.",
    element: "[href='/mosque']"
  }
];

export function Walkthrough() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);

  useEffect(() => {
    // Check of dit de eerste keer is dat de gebruiker de app bezoekt
    const hasSeenWalkthrough = localStorage.getItem('hasSeenWalkthrough');
    if (!hasSeenWalkthrough) {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    if (isVisible && steps[currentStep].element) {
      const element = document.querySelector(steps[currentStep].element!);
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-300');
      }
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }
    };
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setIsVisible(false);
    localStorage.setItem('hasSeenWalkthrough', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="relative w-full max-w-md mx-4 p-6 bg-white shadow-xl">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          onClick={handleFinish}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">{steps[currentStep].title}</h3>
          <p className="text-sm text-gray-600">{steps[currentStep].description}</p>
        </div>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handleFinish}
            className="text-sm"
          >
            Overslaan
          </Button>
          <Button
            onClick={handleNext}
            className="bg-primary hover:bg-primary/90 text-white text-sm"
          >
            {currentStep === steps.length - 1 ? 'Afronden' : 'Volgende'}
          </Button>
        </div>

        <div className="mt-4 flex justify-center gap-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-4 bg-primary'
                  : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
