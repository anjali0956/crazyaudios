import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "admin";
}

export async function GET() {
  try {
    await dbConnect();
    const products = await Product.find();
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();

    // ✅ DEBUG LOG (VERY IMPORTANT)
    console.log("Incoming body:", body);

    if (!body.name || body.price == null || !body.image || body.stock == null || !body.category) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const discountPercentage = Math.max(0, Math.min(95, Number(body.discountPercentage) || 0));
    const flashSale = Boolean(body.flashSale) && discountPercentage > 0;

    const newProduct = await Product.create({
      name: body.name,
      price: body.price,
      image: body.image,
      stock: body.stock,
      category: body.category?.toLowerCase().trim(),
      featured: Boolean(body.featured),
      flashSale,
      discountPercentage: flashSale ? discountPercentage : 0,
      description: Array.isArray(body.description)
        ? body.description
        : ["No description"],
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error("SERVER ERROR:", error); // 🔥 IMPORTANT

    return NextResponse.json(
      {
        message: error.message || "Failed to create product",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const { id } = await req.json();

    await Product.findByIdAndDelete(id);

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const {
      id,
      name,
      price,
      image,
      stock,
      category,
      description,
      featured,
      flashSale,
      discountPercentage,
    } =
      await req.json();

    const normalizedDiscount = Math.max(0, Math.min(95, Number(discountPercentage) || 0));
    const normalizedFlashSale = Boolean(flashSale) && normalizedDiscount > 0;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        name,
        price,
        image,
        stock,
        category: category.toLowerCase().trim(),
        description,
        featured: Boolean(featured),
        flashSale: normalizedFlashSale,
        discountPercentage: normalizedFlashSale ? normalizedDiscount : 0,
      },
      { new: true }
    );

    return NextResponse.json(updatedProduct);
  } catch (error) {
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const { id, featured, flashSale, discountPercentage } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing product id" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof featured === "boolean") {
      updateData.featured = featured;
    }

    const hasFlashInputs =
      typeof flashSale === "boolean" || discountPercentage !== undefined;

    if (hasFlashInputs) {
      const normalizedDiscount = Math.max(0, Math.min(95, Number(discountPercentage) || 0));
      const normalizedFlashSale = Boolean(flashSale) && normalizedDiscount > 0;
      updateData.flashSale = normalizedFlashSale;
      updateData.discountPercentage = normalizedFlashSale ? normalizedDiscount : 0;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return NextResponse.json(updatedProduct);
  } catch (error) {
    return NextResponse.json({ error: "Feature update failed" }, { status: 500 });
  }
}
