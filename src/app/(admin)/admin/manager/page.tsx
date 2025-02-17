"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/hooks/use-toast";
import { Loader2, Search, RefreshCw, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { createUserWithRole } from "@/lib/actions/user-actions";

interface Manager {
	id: string;
	user: {
		name: string;
		email: string;
		phoneNo: string | null;
	};
	class: {
		name: string;
	}[];
}

export default function ManagerPage() {
	const [managers, setManagers] = useState<Manager[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const { toast } = useToast();
	const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [newManager, setNewManager] = useState({
		name: "",
		email: "",
		rollNo: "",
	});

	const fetchManagers = async (searchQuery: string = "") => {
		try {
			const response = await fetch(`/api/admin/managers?search=${searchQuery}`);
			const data = await response.json();
			if (response.ok) {
				setManagers(data.managers || []);
			} else {
				toast({
					variant: "destructive",
					title: "Error",
					description: data.error,
				});
			}
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Error",
				description: "Failed to fetch manager data",
			});
			setManagers([]);
		} finally {
			setLoading(false);
		}
	};

	const handleResetPassword = async (email: string) => {
		setResetPasswordFor(null);
		try {
			const response = await fetch("/api/admin/managers/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			const data = await response.json();

			if (response.ok) {
				toast({
					title: "Success",
					description: "Password has been reset successfully",
				});
			} else {
				throw new Error(data.error);
			}
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to reset password",
			});
		}
	};

	const handleCreateManager = async () => {
		try {
			await createUserWithRole({
				...newManager,
				role: "MANAGER",
			});
			setCreateDialogOpen(false);
			setNewManager({ name: "", email: "", rollNo: "" });
			fetchManagers(search);
			toast({
				title: "Success",
				description: "Manager created successfully",
			});
		} catch (error) {
			toast({
				variant: "destructive",
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to create manager",
			});
		}
	};

	useEffect(() => {
		const debounce = setTimeout(() => {
			fetchManagers(search);
		}, 300);

		return () => clearTimeout(debounce);
	}, [search]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	const renderGridView = () => (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{managers.map((manager) => (
				<Card key={manager.id} className="hover:shadow-lg transition-shadow">
					<CardContent className="p-4">
						<Link
							href={`/profile?profile=${manager.user.email}`}
							className="hover:underline"
						>
							<h2 className="text-xl font-semibold mb-2">
								{manager.user.name}
							</h2>
						</Link>
						<p className="text-sm text-gray-600 mb-1">{manager.user.email}</p>
						<div className="border-t pt-2">
							<h3 className="text-sm font-semibold mb-1">Classes Managing:</h3>
							{manager.class && manager.class.length > 0 ? (
								<ul className="text-sm text-gray-600">
									{manager.class.map((cls, index) => (
										<li key={index} className="mb-1">
											{cls.name}
										</li>
									))}
								</ul>
							) : (
								<p className="text-sm text-gray-500 italic">
									No classes assigned
								</p>
							)}
						</div>
						<div className="border-t pt-2 mt-2">
							<Button
								variant="destructive"
								size="sm"
								className="w-full"
								onClick={() => setResetPasswordFor(manager.user.email)}
							>
								<RefreshCw className="h-4 w-4 mr-2" />
								Reset Password
							</Button>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);

	const renderListView = () => (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Classes</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{managers.map((manager) => (
						<TableRow key={manager.id}>
							<TableCell>
								<Link
									href={`/profile?profile=${manager.user.email}`}
									className="hover:underline"
								>
									{manager.user.name}
								</Link>
							</TableCell>
							<TableCell>{manager.user.email}</TableCell>
							<TableCell>
								{manager.class.map((cls) => cls.name).join(", ") ||
									"No classes"}
							</TableCell>
							<TableCell>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setResetPasswordFor(manager.user.email)}
								>
									<RefreshCw className="h-4 w-4 mr-2" />
									Reset Password
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-6">
				<div className="flex justify-between items-center mb-4">
					<h1 className="text-2xl font-bold">Manager Management</h1>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
						>
							{viewMode === "grid" ? (
								<List className="h-4 w-4" />
							) : (
								<LayoutGrid className="h-4 w-4" />
							)}
						</Button>
						<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
							<DialogTrigger asChild>
								<Button>Create Manager</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Create New Manager</DialogTitle>
								</DialogHeader>
								<div className="flex flex-col gap-4">
									<Input
										placeholder="Name"
										value={newManager.name}
										onChange={(e) =>
											setNewManager((prev) => ({
												...prev,
												name: e.target.value,
											}))
										}
									/>
									<Input
										placeholder="Email"
										type="email"
										value={newManager.email}
										onChange={(e) =>
											setNewManager((prev) => ({
												...prev,
												email: e.target.value,
											}))
										}
									/>
									<Input
										placeholder="Manager ID"
										value={newManager.rollNo}
										onChange={(e) =>
											setNewManager((prev) => ({
												...prev,
												rollNo: e.target.value,
											}))
										}
									/>
									<Button onClick={handleCreateManager}>Create</Button>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>
				<div className="relative mb-4">
					<Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
					<Input
						className="pl-8"
						placeholder="Search managers by name..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
			</div>

			{viewMode === "grid" ? renderGridView() : renderListView()}

			<AlertDialog
				open={!!resetPasswordFor}
				onOpenChange={() => setResetPasswordFor(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reset Password Confirmation</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to reset this manager's password? Their
							password will be reset to their email ID prefix followed by @123.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								resetPasswordFor && handleResetPassword(resetPasswordFor)
							}
						>
							Reset Password
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{managers.length === 0 && !loading && (
				<div className="text-center text-gray-500 mt-8">No managers found</div>
			)}
		</div>
	);
}
