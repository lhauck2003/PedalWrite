import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Camera, ImagePlus, Check, X, AlertCircle, Loader2 } from "lucide-react";

type UploadStep = "capture" | "review" | "confirm" | "done";

interface ParsedFormData {
  riderName: string;
  leaderName: string;
  level: number;
  date: string;
  skillsDetected: number;
  confidence: number;
}

export function UploadFormPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<UploadStep>("capture");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedFormData | null>(null);
  const [editedData, setEditedData] = useState<ParsedFormData | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setStep("review");
  };

  const handleProcess = () => {
    setProcessing(true);
    // Simulate backend call for OCR/AI form parsing
    setTimeout(() => {
      const mock: ParsedFormData = {
        riderName: "Emma Thornton",
        leaderName: "Sarah Mitchell",
        level: 3,
        date: new Date().toISOString().split("T")[0],
        skillsDetected: 6,
        confidence: 87,
      };
      setParsedData(mock);
      setEditedData({ ...mock });
      setProcessing(false);
      setStep("confirm");
    }, 2200);
  };

  const handleConfirm = () => {
    setStep("done");
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 bg-card border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-foreground" style={{ fontSize: "18px", fontWeight: 600 }}>
          Upload Form
        </h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 px-5 py-4">
        {(["capture", "review", "confirm", "done"] as UploadStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                step === s
                  ? "bg-primary text-white"
                  : ["review", "confirm", "done"].indexOf(s) <= ["review", "confirm", "done"].indexOf(step)
                  ? "bg-secondary text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
              style={{ fontSize: "11px", fontWeight: 700 }}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div
                className={`flex-1 h-0.5 ${
                  ["review", "confirm", "done"].indexOf(s) < ["review", "confirm", "done"].indexOf(step)
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 px-5 pb-6">
        {/* Step 1: Capture */}
        {step === "capture" && (
          <div className="flex flex-col items-center gap-6 pt-8">
            <div className="w-full aspect-[3/4] max-h-64 bg-muted rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                <Camera size={28} className="text-accent" />
              </div>
              <p className="text-muted-foreground text-center" style={{ fontSize: "13px" }}>
                Take a photo of the paper assessment form
              </p>
            </div>

            <div className="w-full space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCapture}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl"
                style={{ fontSize: "15px", fontWeight: 600 }}
              >
                <Camera size={20} />
                Take Photo
              </button>
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture");
                    fileInputRef.current.click();
                    setTimeout(() => fileInputRef.current?.setAttribute("capture", "environment"), 500);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-secondary text-primary py-4 rounded-xl border border-border"
                style={{ fontSize: "15px", fontWeight: 500 }}
              >
                <ImagePlus size={20} />
                Choose from Library
              </button>
            </div>

            <div className="w-full bg-accent/10 rounded-xl p-4 flex gap-3">
              <AlertCircle size={16} className="text-accent shrink-0 mt-0.5" />
              <p className="text-foreground" style={{ fontSize: "12px" }}>
                Make sure the form is flat, well-lit, and fully visible. The app will auto-detect the rider name, leader, level, and checked skills.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Review photo */}
        {step === "review" && imagePreview && (
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
              Review your photo before processing
            </p>
            <div className="w-full rounded-2xl overflow-hidden bg-muted">
              <img src={imagePreview} alt="Form photo" className="w-full object-contain max-h-80" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setImagePreview(null);
                  setStep("capture");
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-muted text-foreground py-4 rounded-xl border border-border"
                style={{ fontSize: "14px", fontWeight: 500 }}
              >
                <X size={18} />
                Retake
              </button>
              <button
                onClick={handleProcess}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl"
                style={{ fontSize: "14px", fontWeight: 600 }}
              >
                {processing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Process Form
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm extracted data */}
        {step === "confirm" && editedData && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 bg-secondary rounded-xl p-3">
              <Check size={16} className="text-primary" />
              <p className="text-primary" style={{ fontSize: "13px", fontWeight: 500 }}>
                Form processed — {editedData.confidence}% confidence. Please confirm.
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {[
                { label: "Rider Name", key: "riderName" as const },
                { label: "Leader Name", key: "leaderName" as const },
              ].map(({ label, key }) => (
                <div key={key} className="px-4 py-3 border-b border-border last:border-0">
                  <label className="text-muted-foreground block mb-1" style={{ fontSize: "11px" }}>
                    {label}
                  </label>
                  <input
                    className="w-full bg-transparent text-foreground outline-none"
                    style={{ fontSize: "14px", fontWeight: 500 }}
                    value={editedData[key]}
                    onChange={(e) => setEditedData((d) => d ? { ...d, [key]: e.target.value } : d)}
                  />
                </div>
              ))}

              <div className="px-4 py-3 border-b border-border">
                <label className="text-muted-foreground block mb-1" style={{ fontSize: "11px" }}>
                  Level
                </label>
                <select
                  className="w-full bg-transparent text-foreground outline-none"
                  style={{ fontSize: "14px", fontWeight: 500 }}
                  value={editedData.level}
                  onChange={(e) => setEditedData((d) => d ? { ...d, level: Number(e.target.value) } : d)}
                >
                  {[1, 2, 3, 4].map((l) => (
                    <option key={l} value={l}>Level {l}{l === 4 ? "+" : ""}</option>
                  ))}
                </select>
              </div>

              <div className="px-4 py-3">
                <label className="text-muted-foreground block mb-1" style={{ fontSize: "11px" }}>
                  Skills Detected
                </label>
                <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>
                  {editedData.skillsDetected} skills marked
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setStep("review")}
                className="flex-1 bg-muted text-foreground py-4 rounded-xl border border-border"
                style={{ fontSize: "14px", fontWeight: 500 }}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-primary text-white py-4 rounded-xl"
                style={{ fontSize: "14px", fontWeight: 600 }}
              >
                Confirm & Save
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-6 pt-12">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <Check size={36} className="text-primary" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <h2 className="text-foreground mb-2" style={{ fontSize: "20px", fontWeight: 700 }}>
                Form saved!
              </h2>
              <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
                The assessment form has been uploaded and saved successfully.
              </p>
            </div>
            <div className="w-full space-y-3 mt-4">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-primary text-white py-4 rounded-xl"
                style={{ fontSize: "15px", fontWeight: 600 }}
              >
                Back to Home
              </button>
              <button
                onClick={() => {
                  setStep("capture");
                  setImagePreview(null);
                  setParsedData(null);
                  setEditedData(null);
                }}
                className="w-full bg-secondary text-primary py-4 rounded-xl border border-border"
                style={{ fontSize: "15px", fontWeight: 500 }}
              >
                Upload Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
