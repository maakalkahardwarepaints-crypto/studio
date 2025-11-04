"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { clientSchema, type Client } from "@/lib/schemas";
import { Loader2, Plus, Trash2, UserRound, X } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function ClientManager() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm<Client>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            name: "",
            address: "",
            phone: "",
            email: "",
        },
    });

    const clientsCollection = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/clients`);
    }, [firestore, user]);

    const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);

    const onSubmit = async (data: Client) => {
        if (!user || !firestore) {
            toast({ title: "Error", description: "You must be signed in to add a client.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const clientRef = doc(clientsCollection!);
            const newClient = { ...data, id: clientRef.id };
            
            await setDoc(clientRef, newClient).catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: clientRef.path,
                    operation: 'create',
                    requestResourceData: newClient,
                });
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError;
            });
            
            toast({ title: "Success", description: "Client added successfully." });
            form.reset();
        } catch (error) {
            if (!(error instanceof FirestorePermissionError)) {
                toast({ title: "Error", description: "Failed to add client.", variant: "destructive" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteClient = async () => {
        if (!user || !firestore || !clientToDelete) {
            return;
        }
        setIsDeleting(true);
        try {
            const clientRef = doc(firestore, `users/${user.uid}/clients`, clientToDelete.id!);

            await deleteDoc(clientRef).catch(serverError => {
                 const permissionError = new FirestorePermissionError({
                    path: clientRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError;
            });

            toast({ title: "Success", description: "Client deleted successfully." });
        } catch (error) {
             if (!(error instanceof FirestorePermissionError)) {
                toast({ title: "Error", description: "Failed to delete client.", variant: "destructive" });
            }
        } finally {
            setIsDeleting(false);
            setClientToDelete(null);
        }
    };


    return (
         <AlertDialog open={!!clientToDelete} onOpenChange={(isOpen) => !isOpen && setClientToDelete(null)}>
            <Card>
                <CardHeader>
                    <CardTitle>Client Management</CardTitle>
                    <CardDescription>Add, view, and manage your regular clients here.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold text-lg">Add New Client</h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Client Name</FormLabel>
                                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number (Optional)</FormLabel>
                                        <FormControl><Input placeholder="+1 234 567 890" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="address" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl><Input placeholder="123 Main St, Anytown, USA" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email (Optional)</FormLabel>
                                    <FormControl><Input placeholder="john.doe@example.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Client
                            </Button>
                        </form>
                    </Form>

                    <div>
                        <h3 className="font-semibold text-lg mb-4">Saved Clients</h3>
                        {isLoadingClients ? (
                            <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
                        ) : clients && clients.length > 0 ? (
                            <div className="space-y-3">
                                {clients.map((client) => (
                                    <div key={client.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <UserRound className="h-6 w-6 text-muted-foreground" />
                                            <div>
                                                <p className="font-semibold">{client.name}</p>
                                                <p className="text-sm text-muted-foreground">{client.address}</p>
                                                {(client.phone || client.email) && (
                                                   <p className="text-sm text-muted-foreground">
                                                       {client.phone}{client.phone && client.email && " | "}{client.email}
                                                   </p>
                                                )}
                                            </div>
                                        </div>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => setClientToDelete(client)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center">You haven't added any clients yet.</p>
                        )}
                    </div>

                </CardContent>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the client <span className="font-semibold">{clientToDelete?.name}</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteClient} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </Card>
        </AlertDialog>
    );
}
