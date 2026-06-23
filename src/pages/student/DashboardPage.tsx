import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import {
  Calendar,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  QrCode,
  Loader2,
  Download,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import type { SkillScores } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ActiveCard {
  id: string;
  package_name: string | null;
  sessions_remaining: number | null;
  sessions_total: number | null;
  expires_at: string | null;
  package_type: string | null;
  alert_level: string | null;
  days_remaining: number | null;
}

interface RecentAttendance {
  id: string;
  status: "present" | "absent" | "late" | "excused";
  checked_at: string;
  className: string;
}

interface NextSession {
  id: string;
  scheduled_at: string;
  class_name: string;
  court_name: string | null;
}

interface Stats {
  total: number;
  present: number;
  late: number;
}

interface LatestSkills {
  skills: Partial<SkillScores>;
  overall_score: number | null;
  evaluated_at: string;
}

const STATUS_ICON = {
  present: CheckCircle2,
  absent: XCircle,
  late: Clock,
  excused: Calendar,
};
const STATUS_COLOR = {
  present: "text-green-600 bg-green-50",
  absent: "text-red-500 bg-red-50",
  late: "text-yellow-600 bg-yellow-50",
  excused: "text-blue-600 bg-blue-55/60",
};
const STATUS_LABEL = {
  present: "Có mặt",
  absent: "Vắng",
  late: "Trễ",
  excused: "Phép",
};

export default function StudentDashboardPage() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);
  const [pendingActivationCard, setPendingActivationCard] = useState<
    any | null
  >(null);
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>(
    [],
  );
  const [nextSession, setNextSession] = useState<NextSession | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, late: 0 });
  const [latestSkills, setLatestSkills] = useState<LatestSkills | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    if (qrModalOpen && studentId) {
      setQrLoading(true);
      const data = `${window.location.origin}/coach/attendance/scan?studentId=${studentId}`;
      QRCode.toDataURL(data, { width: 300, margin: 2 })
        .then((url) => {
          setQrCodeDataUrl(url);
          setQrLoading(false);
        })
        .catch((err) => {
          console.error("Failed to generate QR code", err);
          setQrLoading(false);
        });
    }
  }, [qrModalOpen, studentId]);

  // Pending course/package registration states
  const [pendingRegistration, setPendingRegistration] = useState<any | null>(
    null,
  );
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelRegistration = async (regId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn đăng ký học này không?"))
      return;
    setIsCancelling(true);
    try {
      const { error } = await (supabase.rpc as any)(
        "cancel_pending_registration",
        {
          p_registration_id: regId,
        },
      );

      if (error) throw error;

      toast({
        title: "Hủy đăng ký thành công",
        description: "Đơn đăng ký học đã được hủy bỏ.",
      });

      setPendingRegistration(null);
      // Reload page to update other states if needed
      window.location.reload();
    } catch (err: any) {
      console.error("Error cancelling registration:", err.message);
      toast({
        title: "Lỗi hủy đăng ký",
        description: err.message || "Lỗi không xác định",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };



  useEffect(() => {
    if (!profile) return;

    async function fetchData() {
      // Step 1: get student record
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", profile!.id)
        .maybeSingle();

      if (studentError) {
        console.error("Failed to fetch student record:", studentError.message);
        setIsLoading(false);
        return;
      }
      const student = studentData as { id: string } | null;
      if (!student) {
        setIsLoading(false);
        return;
      }
      setStudentId(student.id);

      // Fetch pending registration details
      const { data: pendingRegsData } = await (
        supabase.from("registrations") as any
      )
        .select(
          "id, class_name:classes(name), package_name:packages(name), packages(price)",
        )
        .eq("student_id", student.id)
        .eq("status", "pending")
        .eq("payment_status", "unpaid")
        .order("created_at", { ascending: false });

      if (pendingRegsData && (pendingRegsData as any[]).length > 0) {
        setPendingRegistration((pendingRegsData as any[])[0]);
      } else {
        setPendingRegistration(null);
      }

      // Step 2: get class IDs the student is enrolled in
      const { data: classData } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", student.id)
        .eq("status", "active");

      const classIds = ((classData ?? []) as Array<{ class_id: string }>).map(
        (c) => c.class_id,
      );

      // Step 3: parallel fetches
      const [
        cardRes,
        attendanceRes,
        nextSessionRes,
        statsRes,
        skillsRes,
        pendingActivationRes,
      ] = await Promise.all([
        // Active package
        supabase
          .from("active_student_packages")
          .select(
            "id, package_name, sessions_remaining, sessions_total, expires_at, package_type, alert_level, days_remaining",
          )
          .eq("student_id", student.id)
          .order("activated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Recent attendance (last 5)
        supabase
          .from("attendance")
          .select("id, status, checked_at, sessions(class_id, classes(name))")
          .eq("student_id", student.id)
          .order("checked_at", { ascending: false })
          .limit(5),

        // Next upcoming session
        classIds.length > 0
          ? supabase
              .from("sessions_with_details")
              .select("id, scheduled_at, class_name, court_name")
              .in("class_id", classIds)
              .gte("scheduled_at", new Date().toISOString())
              .neq("status", "cancelled")
              .order("scheduled_at", { ascending: true })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        // Attendance stats (all time)
        supabase
          .from("attendance")
          .select("status")
          .eq("student_id", student.id),

        // Latest skill evaluation
        supabase
          .from("progress_evaluations")
          .select("skills, overall_score, created_at")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Pending activation package
        supabase
          .from("student_packages")
          .select(
            "id, purchased_at, status, sessions_total, sessions_remaining, packages(name, validity_days)",
          )
          .eq("student_id", student.id)
          .eq("status", "pending_activation")
          .order("purchased_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Active card
      if (!cardRes.error) {
        setActiveCard(cardRes.data as ActiveCard | null);
      }

      // Pending activation card
      if (!pendingActivationRes.error) {
        setPendingActivationCard(pendingActivationRes.data as any | null);
      }

      // Recent attendance
      if (!attendanceRes.error) {
        const rows: RecentAttendance[] = (
          (attendanceRes.data ?? []) as unknown[]
        ).map((raw: unknown) => {
          const r = raw as Record<string, unknown>;
          const sess = r.sessions as Record<string, unknown> | null;
          const cls = sess?.classes as Record<string, unknown> | null;
          return {
            id: r.id as string,
            status: r.status as RecentAttendance["status"],
            checked_at: r.checked_at as string,
            className: (cls?.name as string) ?? "—",
          };
        });
        setRecentAttendance(rows);
      }

      // Next session
      if (!nextSessionRes.error && nextSessionRes.data) {
        const s = nextSessionRes.data as Record<string, unknown>;
        setNextSession({
          id: s.id as string,
          scheduled_at: s.scheduled_at as string,
          class_name: s.class_name as string,
          court_name: s.court_name as string | null,
        });
      }

      // Stats
      if (!statsRes.error) {
        const all = (statsRes.data ?? []) as Array<{ status: string }>;
        setStats({
          total: all.length,
          present: all.filter((a) => a.status === "present").length,
          late: all.filter((a) => a.status === "late").length,
        });
      }

      // Latest skills
      if (!skillsRes.error && skillsRes.data) {
        const s = skillsRes.data as Record<string, unknown>;
        setLatestSkills({
          skills: (s.skills as Partial<SkillScores>) ?? {},
          overall_score: s.overall_score as number | null,
          evaluated_at: s.created_at as string,
        });
      }

      setIsLoading(false);
    }

    fetchData();
  }, [profile]);

  const attendanceRate =
    stats.total > 0
      ? Math.round(((stats.present + stats.late) / stats.total) * 100)
      : 0;

  const ALERT_GRADIENT: Record<string, string> = {
    ok: "from-primary-600 to-primary-800",
    warning: "from-yellow-500 to-orange-600",
    critical: "from-red-600 to-red-800",
  };
  const alertLevel = activeCard?.alert_level ?? "ok";
  const gradientClass = ALERT_GRADIENT[alertLevel] ?? ALERT_GRADIENT.ok;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Xin chào, {profile?.full_name} 👋
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Chào mừng trở lại Thái Phong Badminton Class
          </p>
        </div>
        {studentId && (
          <Button
            onClick={() => {
              setQrLoading(true);
              setQrModalOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl gap-2 flex items-center h-11 px-4 w-fit shadow-sm"
          >
            <QrCode className="w-4.5 h-4.5" /> Mã QR đi học
          </Button>
        )}
      </div>

      {/* Đơn đăng ký học chờ thanh toán */}
      {!isLoading && pendingRegistration && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-850">
                Đơn đăng ký học của bạn đang chờ thanh toán
              </h4>
              <p className="text-xs text-amber-700 mt-0.5 leading-normal font-medium">
                Đăng ký lớp:{" "}
                <span className="font-bold text-amber-900">
                  {(pendingRegistration as any).class_name?.name || "—"}
                </span>{" "}
                · Gói học:{" "}
                <span className="font-bold text-amber-900">
                  {(pendingRegistration as any).package_name?.name || "—"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 font-sans">
            <Button
              onClick={() => navigate("/student/packages")}
              className="bg-amber-650 hover:bg-amber-750 text-white rounded-xl text-xs font-bold px-4 h-9 shadow-sm"
            >
              Thanh toán ngay
            </Button>
            <Button
              onClick={() => handleCancelRegistration(pendingRegistration.id)}
              disabled={isCancelling}
              variant="outline"
              className="border-gray-200 text-gray-500 hover:text-red-655 hover:bg-red-55/60 rounded-xl text-xs font-bold px-4 h-9"
            >
              {isCancelling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Hủy đăng ký"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Cảnh báo trạng thái thẻ học của học viên */}
      {!isLoading &&
        (() => {
          if (!activeCard) {
            if (pendingActivationCard) {
              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-4.5 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-850">
                        Có thẻ học chờ kích hoạt
                      </h4>
                      <p className="text-xs text-amber-700 mt-0.5 leading-normal">
                        Bạn có thẻ học{" "}
                        <strong className="text-amber-950 font-bold">
                          {pendingActivationCard.packages?.name || "Gói học"}
                        </strong>{" "}
                        đang chờ kích hoạt. Thẻ sẽ tự động kích hoạt khi bạn
                        điểm danh buổi đầu tiên hoặc liên hệ Admin để kích hoạt.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-4.5 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-850">
                      Chưa có thẻ học hoạt động
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5 leading-normal">
                      Tài khoản của bạn hiện chưa có thẻ học nào đang hoạt động.
                      Vui lòng đăng ký thẻ học mới để kích hoạt và ghi nhận lịch
                      tập luyện.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/student/packages")}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold w-full sm:w-auto px-4 h-9.5 shrink-0 shadow-sm border border-amber-600"
                >
                  Đăng ký thẻ học
                </Button>
              </div>
            );
          }

          if (alertLevel === "warning") {
            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-orange-50 border border-orange-200 rounded-2xl p-4.5 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-orange-850">
                      Thẻ học sắp hết hạn/hết buổi
                    </h4>
                    <p className="text-xs text-orange-700 mt-0.5 leading-normal">
                      Thẻ học{" "}
                      <strong className="text-orange-950 font-bold">
                        {activeCard.package_name}
                      </strong>{" "}
                      của bạn đang ở mức cảnh báo sắp hết hạn hoặc sắp hết số
                      buổi tập. Hãy gia hạn sớm để tránh gián đoạn.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/student/packages")}
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold w-full sm:w-auto px-4 h-9.5 shrink-0 shadow-sm border border-orange-600"
                >
                  Gia hạn ngay
                </Button>
              </div>
            );
          }

          if (alertLevel === "critical") {
            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl p-4.5 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-850">
                      Thẻ học đã hết hạn/hết buổi
                    </h4>
                    <p className="text-xs text-red-700 mt-0.5 leading-normal">
                      Thẻ học{" "}
                      <strong className="text-red-950 font-bold">
                        {activeCard.package_name}
                      </strong>{" "}
                      đã cạn số buổi hoặc quá hạn sử dụng. Hãy đăng ký thẻ học
                      mới ngay hôm nay để có thể tiếp tục điểm danh khi đến lớp.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/student/packages")}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold w-full sm:w-auto px-4 h-9.5 shrink-0 shadow-sm border border-red-600"
                >
                  Mua thẻ học mới
                </Button>
              </div>
            );
          }

          return null;
        })()}

      {/* Active membership card */}
      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-2xl" />
      ) : activeCard ? (
        <div
          className={`bg-gradient-to-br ${gradientClass} rounded-2xl p-5 text-white shadow-md relative overflow-hidden`}
        >
          {/* Decorative lines */}
          <div className="absolute right-0 top-0 w-40 h-full opacity-10 pointer-events-none">
            <div className="absolute right-4  top-0 bottom-0 border-r border-white" />
            <div className="absolute right-16 top-0 bottom-0 border-r border-white" />
          </div>

          {alertLevel !== "ok" && (
            <div className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5 mb-3 w-fit">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {alertLevel === "critical" ? "Thẻ sắp hết!" : "Sắp hết hạn"}
              </span>
            </div>
          )}

          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-xs">Gói hiện tại</p>
              <p className="text-white font-bold text-lg mt-0.5">
                {activeCard.package_name}
              </p>
            </div>
            <CreditCard className="w-6 h-6 text-white/50" />
          </div>

          <div className="flex gap-6 mt-4">
            {activeCard.package_type === "session" &&
              activeCard.sessions_total !== null && (
                <div>
                  <p className="text-white/70 text-xs">Buổi còn lại</p>
                  <p className="text-white font-bold text-xl">
                    {activeCard.sessions_remaining ?? 0}
                    <span className="text-sm font-normal text-white/60">
                      {" "}
                      / {activeCard.sessions_total}
                    </span>
                  </p>
                </div>
              )}
            {activeCard.expires_at && (
              <div>
                <p className="text-white/70 text-xs">Hết hạn</p>
                <p className="text-white font-bold text-xl">
                  {formatDate(activeCard.expires_at)}
                </p>
                {activeCard.days_remaining !== null && (
                  <p className="text-white/60 text-xs">
                    còn {activeCard.days_remaining} ngày
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : pendingActivationCard ? (
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          {/* Decorative lines */}
          <div className="absolute right-0 top-0 w-40 h-full opacity-10 pointer-events-none">
            <div className="absolute right-4  top-0 bottom-0 border-r border-white" />
            <div className="absolute right-16 top-0 bottom-0 border-r border-white" />
          </div>

          <div className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5 mb-3 w-fit">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Chờ kích hoạt
            </span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/80 text-xs font-medium">GÓI HỌC</p>
              <h3 className="text-lg font-bold tracking-tight">
                {pendingActivationCard.packages?.name || "Gói học"}
              </h3>
            </div>
            <CreditCard className="w-6 h-6 text-white/50" />
          </div>

          <div className="mt-5 pt-3 border-t border-white/20 flex justify-between items-end">
            <div>
              <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                Số buổi tập
              </p>
              <p className="text-sm font-bold">
                {pendingActivationCard.sessions_total} buổi
              </p>
            </div>
            <div>
              <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider mb-0.5 text-right">
                Điều kiện kích hoạt
              </p>
              <p className="text-[11px] font-medium text-white/90 text-right leading-tight max-w-[200px]">
                Điểm danh lần đầu hoặc kích hoạt bởi Admin
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
          <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            Bạn chưa có thẻ học đang hoạt động
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Liên hệ Admin để được cấp thẻ
          </p>
        </div>
      )}

      {/* KPI stats */}
      {!isLoading && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Đã học", value: stats.total, color: "text-gray-900" },
            { label: "Có mặt", value: stats.present, color: "text-green-600" },
            { label: "Trễ", value: stats.late, color: "text-yellow-600" },
            {
              label: "Chuyên cần",
              value: `${attendanceRate}%`,
              color: "text-primary-700",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4"
            >
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Skill bars from latest evaluation */}
      {!isLoading && latestSkills && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Kỹ năng</h3>
            <button
              onClick={() => navigate("/student/progress")}
              className="text-xs text-primary-700 hover:text-primary-800 flex items-center gap-0.5"
            >
              Chi tiết <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {(
              [
                {
                  key: "technique" as keyof SkillScores,
                  label: "Kỹ thuật",
                  color: "bg-blue-500",
                },
                {
                  key: "footwork" as keyof SkillScores,
                  label: "Di chuyển",
                  color: "bg-court-500",
                },
                {
                  key: "tactics" as keyof SkillScores,
                  label: "Chiến thuật",
                  color: "bg-purple-500",
                },
                {
                  key: "fitness" as keyof SkillScores,
                  label: "Thể lực",
                  color: "bg-orange-500",
                },
              ] as Array<{
                key: keyof SkillScores;
                label: string;
                color: string;
              }>
            ).map(({ key, label, color }) => {
              const val = latestSkills.skills[key] ?? 0;
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-600">{label}</span>
                    <span className="text-xs font-semibold text-gray-900">
                      {val}/100
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: `${val as number}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {latestSkills.overall_score !== null && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Điểm tổng · {formatDate(latestSkills.evaluated_at)}
              </span>
              <span className="text-sm font-bold text-primary-700">
                {latestSkills.overall_score}/100
              </span>
            </div>
          )}
        </div>
      )}

      {/* Next session */}
      {!isLoading && nextSession && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="bg-court-50 p-2.5 rounded-xl flex-shrink-0">
            <Calendar className="w-5 h-5 text-court-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Buổi học tiếp theo</p>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {nextSession.class_name}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(nextSession.scheduled_at)}
              {nextSession.court_name ? ` · ${nextSession.court_name}` : ""}
            </p>
          </div>
          <button
            onClick={() => navigate("/student/schedule")}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick nav (when no attendance data yet) */}
      {!isLoading && stats.total === 0 && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/student/schedule")}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="bg-court-50 p-2.5 rounded-xl">
              <Calendar className="w-5 h-5 text-court-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Lịch học</p>
              <p className="text-sm font-semibold text-gray-900">Xem lịch</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/student/progress")}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="bg-purple-50 p-2.5 rounded-xl">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tiến độ</p>
              <p className="text-sm font-semibold text-gray-900">
                Xem đánh giá
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Recent attendance */}
      {!isLoading && recentAttendance.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Điểm danh gần đây
            </h3>
            <button
              onClick={() => navigate("/student/attendance")}
              className="text-xs text-primary-700 hover:text-primary-800 flex items-center gap-0.5"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            {recentAttendance.map((r) => {
              const StatusIcon = STATUS_ICON[r.status] ?? CheckCircle2;
              const colorClass = STATUS_COLOR[r.status] ?? STATUS_COLOR.present;
              return (
                <div key={r.id} className="flex items-center gap-3 p-3.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}
                  >
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {r.className}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(r.checked_at)}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* QR Code Modal */}
      {qrModalOpen && studentId && (
        <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
          <DialogContent className="max-w-sm rounded-3xl">
            <DialogHeader className="text-center">
              <DialogTitle className="font-extrabold text-lg text-center text-red-600 flex items-center justify-center gap-1.5">
                <QrCode className="w-5 h-5 text-red-500" /> Mã QR Đi Học
              </DialogTitle>
              <DialogDescription className="text-xs text-center text-gray-500">
                Đưa mã này cho huấn luyện viên quét để điểm danh khi đến lớp
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-gray-150 shadow-inner flex items-center justify-center w-60 h-60 relative overflow-hidden">
                {qrLoading && (
                  <Loader2 className="w-8 h-8 animate-spin text-red-655 absolute" />
                )}
                {qrCodeDataUrl && (
                  <img
                    src={qrCodeDataUrl}
                    alt="Mã QR đi học"
                    className={`w-full h-full object-contain transition-opacity duration-300 ${qrLoading ? "opacity-0" : "opacity-100"}`}
                  />
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (qrCodeDataUrl) {
                    const link = document.createElement("a");
                    link.href = qrCodeDataUrl;
                    link.download = `QR_DiHoc_${profile?.full_name?.replace(/\s+/g, "_") || "HocVien"}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                className="text-xs font-semibold text-gray-650 border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1.5 py-1 px-3 rounded-lg shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Tải xuống mã QR
              </Button>

              <div className="text-center">
                <p className="text-sm font-extrabold text-gray-900">
                  {profile?.full_name}
                </p>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                  Học viên Thái Phong Badminton Class
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-805 rounded-xl font-bold py-5 text-xs"
                onClick={() => setQrModalOpen(false)}
              >
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
