import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useNavigate, Link } from "react-router-dom";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  useEffect(() => {
    // Redirect jika sudah login
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Error during sign in:", error);
      setIsLoading(false);
      toast.error(error.message);
    } else {
      toast.success("Login berhasil!");
      navigate("/"); // Alihkan ke halaman utama setelah login
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Error during sign up:", error);
      setIsLoading(false);
      toast.error(error.message);
    } else {
      if (data.user) {
        // Simpan data pengguna ke tabel `users` dengan role: basic
        const { error: insertError } = await supabase.from("users").insert([
          {
            id: data.user.id,
            email: data.user.email,
            role: "basic", // Semua user baru adalah basic runner
          },
        ]);

        if (insertError) {
          console.error(
            "Error inserting user into 'users' table:",
            insertError
          );
          toast.error(
            "Pendaftaran berhasil, tetapi gagal menyimpan data pengguna."
          );
        } else {
          toast.success(
            "Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi."
          );
        }
      }
      navigate("/"); // Alihkan ke halaman utama setelah pendaftaran
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 pt-12 pb-12">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">
          {isRegister ? "Daftar Akun" : "Masuk ke Runmate"}
        </h2>
        <p className="mb-8 text-center text-gray-600">
          {isRegister
            ? "Bergabunglah dengan komunitas pelari!"
            : "Akses fitur favorit dan kelola event."}
        </p>
        <form
          onSubmit={isRegister ? handleRegister : handleLogin}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // Warna fokus input menjadi biru
              className="w-full rounded-lg border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              // Warna fokus input menjadi biru
              className="w-full rounded-lg border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
              required
            />
          </div>
          <button
            type="submit"
            // Warna tombol submit menjadi biru
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-lg font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:bg-gray-400"
            disabled={isLoading}
          >
            {isLoading && <Loader size={24} className="animate-spin" />}
            <span>{isRegister ? "Daftar" : "Login"}</span>
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            // Warna tautan menjadi biru
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            {isRegister
              ? "Sudah punya akun? Login di sini."
              : "Belum punya akun? Daftar sekarang."}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
