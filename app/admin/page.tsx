'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExpertSettings, defaultExpertSettings } from '@/lib/calculations';

export default function AdminPage() {
  const [settings, setSettings] = useState<ExpertSettings>(defaultExpertSettings);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('expertSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('expertSettings', JSON.stringify(settings));
    alert('Einstellungen gespeichert!');
  };

  const handleReset = () => {
    setSettings(defaultExpertSettings);
    localStorage.removeItem('expertSettings');
    alert('Einstellungen zurückgesetzt!');
  };

  const updateCO2Tax = (year: number, price: number) => {
    setSettings(prev => ({
      ...prev,
      co2TaxSchedule: prev.co2TaxSchedule.map(item =>
        item.year === year ? { ...item, pricePerTon: price } : item
      ),
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--color--light-grey)] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[var(--color--dark-blue)] mb-2">
              Admin Dashboard
            </h1>
            <p className="text-[var(--color--dark-grey)]">
              Experteneinstellungen für Berechnungen
            </p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-[var(--color--light-blue)] text-white font-bold rounded-lg hover:bg-[var(--color--dark-blue)] transition-colors"
          >
            Zur Kundenansicht
          </Link>
        </div>

        {/* Settings Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-[var(--color--dark-blue)] mb-6">
            Technische Annahmen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                Spezifischer PV-Ertrag (kWh/kWp/Jahr)
              </label>
              <input
                type="number"
                value={settings.pvYieldPerKwp}
                onChange={(e) =>
                  setSettings({ ...settings, pvYieldPerKwp: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
              />
              <p className="text-xs text-[var(--color--dark-grey)] mt-1">
                Typisch: 900-1200 je nach Region
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                Wirkungsgrad Wärmepumpe (JAZ)
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.heatPumpJAZ}
                onChange={(e) =>
                  setSettings({ ...settings, heatPumpJAZ: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
              />
              <p className="text-xs text-[var(--color--dark-grey)] mt-1">
                Typisch: 3.5-4.5
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                Basis-Autarkie ohne Speicher/EMS (%)
              </label>
              <input
                type="number"
                value={settings.baseAutarky}
                onChange={(e) =>
                  setSettings({ ...settings, baseAutarky: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
              />
              <p className="text-xs text-[var(--color--dark-grey)] mt-1">
                Typisch: 25-35%
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                Steigerung durch Speicher (%)
              </label>
              <input
                type="number"
                value={settings.batteryAutarkyBoost}
                onChange={(e) =>
                  setSettings({ ...settings, batteryAutarkyBoost: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
              />
              <p className="text-xs text-[var(--color--dark-grey)] mt-1">
                Typisch: 20-30% zusätzlich
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                Steigerung durch EMS (%)
              </label>
              <input
                type="number"
                value={settings.emsAutarkyBoost}
                onChange={(e) =>
                  setSettings({ ...settings, emsAutarkyBoost: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
              />
              <p className="text-xs text-[var(--color--dark-grey)] mt-1">
                Typisch: 10-20% zusätzlich
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color--dark-blue)] mb-6 mt-8">
            Preis- & Kostenannahmen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                Einspeisevergütung (ct/kWh)
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.feedInTariff}
                onChange={(e) =>
                  setSettings({ ...settings, feedInTariff: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                CO₂-Emissionen Gas (kg/kWh)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.co2EmissionsGas}
                onChange={(e) =>
                  setSettings({ ...settings, co2EmissionsGas: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
              />
              <p className="text-xs text-[var(--color--dark-grey)] mt-1">
                Typisch: 0.2 kg/kWh
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                Jährliche Strompreissteigerung (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.electricityPriceIncrease}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    electricityPriceIncrease: parseFloat(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                Jährliche Gaspreissteigerung (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.gasPriceIncrease}
                onChange={(e) =>
                  setSettings({ ...settings, gasPriceIncrease: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none"
              />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color--dark-blue)] mb-6 mt-8">
            CO₂-Steuer Zeitplan
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {settings.co2TaxSchedule.map((item) => (
              <div key={item.year}>
                <label className="block text-sm font-semibold text-[var(--color--black)] mb-2">
                  {item.year}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={item.pricePerTon}
                    onChange={(e) => updateCO2Tax(item.year, parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-[var(--color--medium-grey)] rounded-lg focus:border-[var(--color--light-blue)] focus:outline-none pr-8"
                  />
                  <span className="absolute right-3 top-2 text-sm text-[var(--color--dark-grey)]">
                    €
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-[var(--color--green)] text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Einstellungen speichern
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-[var(--color--dark-grey)] text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Zurücksetzen
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-6 bg-[var(--color--light-blue)] bg-opacity-10 rounded-xl border-2 border-[var(--color--light-blue)]">
          <h3 className="text-lg font-bold text-[var(--color--dark-blue)] mb-2">
            💡 Hinweis
          </h3>
          <p className="text-[var(--color--black)]">
            Diese Einstellungen werden im Browser-Speicher gespeichert und gelten für alle
            Berechnungen. Die Kundenansicht verwendet diese Werte automatisch.
          </p>
        </div>
      </div>
    </div>
  );
}
