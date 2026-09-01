import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  onBackToHistory: () => void;
  caseId?: string;
  t?: (ta: string, en: string) => string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CaseErrorBoundary extends Component<Props, State> {
  declare props: Props;
  declare state: State;
  declare setState: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CRITICAL: Case rendering error caught by CaseErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onBackToHistory();
  };

  render() {
    if (this.state.hasError) {
      const t = this.props.t || ((ta, en) => ta);

      return (
        <div className="bg-rose-50/90 border-2 border-rose-300 rounded-3xl p-8 max-w-3xl mx-auto my-8 shadow-lg text-slate-900">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>

            <div className="space-y-3 flex-1">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  {t("தரவு காட்சிப் பிழை", "DATA RENDERING EXCEPTION")}
                </span>
                <h3 className="text-lg font-black text-rose-950 mt-1.5">
                  {t(
                    "வழக்கு பகுப்பாய்வை காண்பிப்பதில் எதிர்பாராத பிழை ஏற்பட்டது",
                    "Unexpected Error While Rendering Case Analysis"
                  )}
                </h3>
              </div>

              <p className="text-xs text-rose-800 font-medium leading-relaxed">
                {t(
                  "இந்த வழக்கின் பழைய தரவு அமைப்பில் சில முரண்பாடுகள் காரணமாக திரையில் காண்பிக்க முடியவில்லை. உங்கள் வழக்கு வரலாறு பாதுகாப்பாக உள்ளது.",
                  "This case record encountered a structure mismatch during rendering. Your case history and stored data remain safe."
                )}
              </p>

              {this.state.error && (
                <div className="p-3 bg-white/80 border border-rose-200 rounded-xl font-mono text-[11px] text-rose-900 overflow-x-auto max-h-32">
                  <strong>Error:</strong> {this.state.error.message || String(this.state.error)}
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{t("வழக்கு வரலாற்றிற்குத் திரும்பு", "Back to Case History")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2.5 bg-white border border-rose-300 hover:bg-rose-100 text-rose-900 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-rose-600" />
                  <span>{t("பக்கத்தை புதுப்பி", "Reload Page")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
